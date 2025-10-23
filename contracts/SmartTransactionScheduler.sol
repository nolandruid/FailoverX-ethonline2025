// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SmartTransactionScheduler
 * @dev A contract for scheduling transaction intents with cross-chain failover capabilities
 * @notice This contract stores user transaction intents and preferences for off-chain execution
 */
contract SmartTransactionScheduler is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Enums
    enum ActionType {
        TRANSFER,           // Simple token/ETH transfer
        SWAP,              // DEX swap operation
        CONTRACT_CALL      // Generic contract interaction
    }

    enum IntentStatus {
        PENDING,           // Intent created, waiting for execution
        EXECUTING,         // Currently being processed
        COMPLETED,         // Successfully executed
        FAILED,           // Execution failed
        CANCELLED         // Cancelled by user
    }

    // Structs
    struct TransactionIntent {
        uint256 intentId;
        address creator;
        
        // Primary transaction details
        address targetToken;        // Token address (address(0) for ETH)
        uint256 amount;            // Amount to transfer/swap
        address recipient;         // Target recipient
        ActionType actionType;     // Type of action to perform
        bytes callData;           // For contract interactions
        
        // Scheduling
        uint256 executeAfter;     // Earliest execution timestamp
        uint256 deadline;         // Latest execution timestamp
        
        // Failover configuration
        uint256[] failoverChains; // Chain IDs in priority order
        uint256 maxGasPrice;      // Maximum gas price (wei)
        uint256 slippageTolerance; // For swaps (basis points, e.g., 100 = 1%)
        
        // Status tracking
        IntentStatus status;
        uint256 createdAt;
        uint256 lastAttemptAt;
        string failureReason;
    }

    struct ChainGasEstimate {
        uint256 chainId;
        uint256 estimatedGas;     // Gas units
        uint256 gasPrice;         // Gas price in wei
        bool isActive;            // Whether this chain is supported
    }

    // State variables
    uint256 private _nextIntentId;
    mapping(uint256 => TransactionIntent) public intents;
    mapping(address => uint256[]) public userIntents;
    mapping(uint256 => ChainGasEstimate) public chainGasEstimates;
    
    // Supported chains for demo
    uint256[] public supportedChains;
    
    // Whitelisted contracts for CONTRACT_CALL actions
    mapping(address => bool) public whitelistedContracts;

    // Events
    event IntentCreated(
        uint256 indexed intentId,
        address indexed creator,
        ActionType actionType,
        address targetToken,
        uint256 amount
    );
    
    event IntentStatusUpdated(
        uint256 indexed intentId,
        IntentStatus oldStatus,
        IntentStatus newStatus,
        string reason
    );
    
    event IntentExecuted(
        uint256 indexed intentId,
        address indexed executor,
        uint256 chainId,
        bool success
    );
    
    event ChainGasEstimateUpdated(
        uint256 indexed chainId,
        uint256 estimatedGas,
        uint256 gasPrice
    );
    
    event FailoverInitiated(
        uint256 indexed intentId,
        uint256 fromChainId,
        uint256 toChainId,
        string reason
    );
    
    event FailoverCompleted(
        uint256 indexed intentId,
        uint256 chainId,
        bool success,
        string details
    );
    
    event CrossChainExecutionRequested(
        uint256 indexed intentId,
        uint256 targetChainId,
        address executor,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyIntentCreator(uint256 intentId) {
        require(intents[intentId].creator == msg.sender, "Not intent creator");
        _;
    }

    modifier validIntent(uint256 intentId) {
        require(intents[intentId].creator != address(0), "Intent does not exist");
        _;
    }

    constructor() {
        _nextIntentId = 1;
        
        // Initialize with common testnet chain IDs and static gas estimates
        _initializeChainEstimates();
    }

    /**
     * @dev Initialize static gas estimates for common chains (for demo purposes)
     */
    function _initializeChainEstimates() private {
        // Ethereum Sepolia
        chainGasEstimates[11155111] = ChainGasEstimate({
            chainId: 11155111,
            estimatedGas: 21000,
            gasPrice: 20 gwei,
            isActive: true
        });
        supportedChains.push(11155111);
        
        // Polygon Mumbai (deprecated but for demo)
        chainGasEstimates[80001] = ChainGasEstimate({
            chainId: 80001,
            estimatedGas: 21000,
            gasPrice: 30 gwei,
            isActive: true
        });
        supportedChains.push(80001);
        
        // Arbitrum Sepolia
        chainGasEstimates[421614] = ChainGasEstimate({
            chainId: 421614,
            estimatedGas: 21000,
            gasPrice: 0.1 gwei,
            isActive: true
        });
        supportedChains.push(421614);
        
        // Optimism Sepolia
        chainGasEstimates[11155420] = ChainGasEstimate({
            chainId: 11155420,
            estimatedGas: 21000,
            gasPrice: 0.001 gwei,
            isActive: true
        });
        supportedChains.push(11155420);
        
        // Hedera Testnet
        chainGasEstimates[296] = ChainGasEstimate({
            chainId: 296,
            estimatedGas: 21000,
            gasPrice: 0.00001 ether, // Very low gas price - one of Hedera's benefits
            isActive: true
        });
        supportedChains.push(296);
    }

    /**
     * @dev Create a new transaction intent
     * @param targetToken Token address (address(0) for ETH)
     * @param amount Amount to transfer/swap
     * @param recipient Target recipient
     * @param actionType Type of action (TRANSFER, SWAP, CONTRACT_CALL)
     * @param callData Call data for contract interactions
     * @param executeAfter Earliest execution timestamp
     * @param deadline Latest execution timestamp
     * @param failoverChains Array of chain IDs in priority order
     * @param maxGasPrice Maximum gas price willing to pay
     * @param slippageTolerance Slippage tolerance for swaps (basis points)
     */
    function createIntent(
        address targetToken,
        uint256 amount,
        address recipient,
        ActionType actionType,
        bytes calldata callData,
        uint256 executeAfter,
        uint256 deadline,
        uint256[] calldata failoverChains,
        uint256 maxGasPrice,
        uint256 slippageTolerance
    ) external payable nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(executeAfter <= deadline, "Execute after must be before deadline");
        require(failoverChains.length > 0, "Must specify at least one failover chain");
        
        // Validate failover chains
        for (uint256 i = 0; i < failoverChains.length; i++) {
            require(chainGasEstimates[failoverChains[i]].isActive, "Unsupported chain");
        }
        
        // For CONTRACT_CALL, validate the target contract is whitelisted
        if (actionType == ActionType.CONTRACT_CALL) {
            require(whitelistedContracts[recipient], "Contract not whitelisted");
        }
        
        uint256 intentId = _nextIntentId++;
        
        // Handle ETH deposits for ETH transfers
        if (targetToken == address(0)) {
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            // For ERC20 tokens, transfer to contract
            IERC20(targetToken).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        intents[intentId] = TransactionIntent({
            intentId: intentId,
            creator: msg.sender,
            targetToken: targetToken,
            amount: amount,
            recipient: recipient,
            actionType: actionType,
            callData: callData,
            executeAfter: executeAfter,
            deadline: deadline,
            failoverChains: failoverChains,
            maxGasPrice: maxGasPrice,
            slippageTolerance: slippageTolerance,
            status: IntentStatus.PENDING,
            createdAt: block.timestamp,
            lastAttemptAt: 0,
            failureReason: ""
        });
        
        userIntents[msg.sender].push(intentId);
        
        emit IntentCreated(intentId, msg.sender, actionType, targetToken, amount);
        
        return intentId;
    }

    /**
     * @dev Get transaction intent details
     * @param intentId The intent ID to query
     */
    function getIntent(uint256 intentId) external view validIntent(intentId) returns (TransactionIntent memory) {
        return intents[intentId];
    }

    /**
     * @dev Get all intent IDs for a user
     * @param user The user address
     */
    function getUserIntents(address user) external view returns (uint256[] memory) {
        return userIntents[user];
    }

    /**
     * @dev Get gas estimates for all supported chains
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }

    /**
     * @dev Get gas estimate for a specific chain
     * @param chainId The chain ID to query
     */
    function getChainGasEstimate(uint256 chainId) external view returns (ChainGasEstimate memory) {
        return chainGasEstimates[chainId];
    }

    /**
     * @dev Cancel a pending intent (only by creator)
     * @param intentId The intent ID to cancel
     */
    function cancelIntent(uint256 intentId) external onlyIntentCreator(intentId) nonReentrant {
        TransactionIntent storage intent = intents[intentId];
        require(intent.status == IntentStatus.PENDING, "Intent cannot be cancelled");
        
        IntentStatus oldStatus = intent.status;
        intent.status = IntentStatus.CANCELLED;
        
        // Refund the deposited tokens/ETH
        if (intent.targetToken == address(0)) {
            payable(intent.creator).transfer(intent.amount);
        } else {
            IERC20(intent.targetToken).safeTransfer(intent.creator, intent.amount);
        }
        
        emit IntentStatusUpdated(intentId, oldStatus, IntentStatus.CANCELLED, "Cancelled by user");
    }

    /**
     * @dev Manual execution function for demo purposes
     * @param intentId The intent ID to execute
     * @dev In production, this would be called by authorized keepers/relayers
     */
    function executeIntent(uint256 intentId) external nonReentrant validIntent(intentId) {
        TransactionIntent storage intent = intents[intentId];
        require(intent.status == IntentStatus.PENDING, "Intent not pending");
        require(block.timestamp >= intent.executeAfter, "Too early to execute");
        require(block.timestamp <= intent.deadline, "Intent expired");
        
        IntentStatus oldStatus = intent.status;
        intent.status = IntentStatus.EXECUTING;
        intent.lastAttemptAt = block.timestamp;
        
        emit IntentStatusUpdated(intentId, oldStatus, IntentStatus.EXECUTING, "Execution started");
        
        bool success = false;
        
        try this._executeIntentLogic(intentId) {
            intent.status = IntentStatus.COMPLETED;
            success = true;
            emit IntentStatusUpdated(intentId, IntentStatus.EXECUTING, IntentStatus.COMPLETED, "Execution successful");
        } catch Error(string memory reason) {
            intent.status = IntentStatus.FAILED;
            intent.failureReason = reason;
            emit IntentStatusUpdated(intentId, IntentStatus.EXECUTING, IntentStatus.FAILED, reason);
        } catch {
            intent.status = IntentStatus.FAILED;
            intent.failureReason = "Unknown error";
            emit IntentStatusUpdated(intentId, IntentStatus.EXECUTING, IntentStatus.FAILED, "Unknown error");
        }
        
        emit IntentExecuted(intentId, msg.sender, block.chainid, success);
    }

    /**
     * @dev Internal function to execute intent logic
     * @param intentId The intent ID to execute
     */
    function _executeIntentLogic(uint256 intentId) external {
        require(msg.sender == address(this), "Internal function");
        
        TransactionIntent storage intent = intents[intentId];
        
        if (intent.actionType == ActionType.TRANSFER) {
            // Simple transfer
            if (intent.targetToken == address(0)) {
                payable(intent.recipient).transfer(intent.amount);
            } else {
                IERC20(intent.targetToken).safeTransfer(intent.recipient, intent.amount);
            }
        } else if (intent.actionType == ActionType.SWAP) {
            // For demo: just transfer tokens (real implementation would call DEX)
            require(false, "Swap not implemented in demo");
        } else if (intent.actionType == ActionType.CONTRACT_CALL) {
            // For demo: just revert (real implementation would make the call)
            require(false, "Contract call not implemented in demo");
        }
    }

    // Admin functions
    
    /**
     * @dev Update gas estimates for a chain (only owner)
     * @param chainId The chain ID
     * @param estimatedGas Gas estimate in units
     * @param gasPrice Gas price in wei
     * @param isActive Whether the chain is active
     */
    function updateChainGasEstimate(
        uint256 chainId,
        uint256 estimatedGas,
        uint256 gasPrice,
        bool isActive
    ) external onlyOwner {
        chainGasEstimates[chainId] = ChainGasEstimate({
            chainId: chainId,
            estimatedGas: estimatedGas,
            gasPrice: gasPrice,
            isActive: isActive
        });
        
        // Add to supported chains if new and active
        if (isActive) {
            bool exists = false;
            for (uint256 i = 0; i < supportedChains.length; i++) {
                if (supportedChains[i] == chainId) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                supportedChains.push(chainId);
            }
        }
        
        emit ChainGasEstimateUpdated(chainId, estimatedGas, gasPrice);
    }

    /**
     * @dev Add contract to whitelist (only owner)
     * @param contractAddress The contract address to whitelist
     */
    function whitelistContract(address contractAddress) external onlyOwner {
        whitelistedContracts[contractAddress] = true;
    }

    /**
     * @dev Remove contract from whitelist (only owner)
     * @param contractAddress The contract address to remove
     */
    function removeContractFromWhitelist(address contractAddress) external onlyOwner {
        whitelistedContracts[contractAddress] = false;
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // View functions for off-chain monitoring
    
    /**
     * @dev Get all pending intents (for keeper monitoring)
     */
    function getPendingIntents() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count pending intents
        for (uint256 i = 1; i < _nextIntentId; i++) {
            if (intents[i].status == IntentStatus.PENDING && 
                block.timestamp >= intents[i].executeAfter &&
                block.timestamp <= intents[i].deadline) {
                count++;
            }
        }
        
        // Second pass: collect pending intent IDs
        uint256[] memory pendingIntents = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _nextIntentId; i++) {
            if (intents[i].status == IntentStatus.PENDING && 
                block.timestamp >= intents[i].executeAfter &&
                block.timestamp <= intents[i].deadline) {
                pendingIntents[index] = i;
                index++;
            }
        }
        
        return pendingIntents;
    }

    /**
     * @dev Get total number of intents created
     */
    function getTotalIntents() external view returns (uint256) {
        return _nextIntentId - 1;
    }

    // ============================================
    // FAILOVER ROUTING FUNCTIONS
    // ============================================

    /**
     * @dev Initiate failover to alternative chain
     * @param intentId The intent ID to failover
     * @param reason Reason for failover (e.g., "High gas price", "Transaction timeout")
     * @notice This function is called by off-chain keepers/relayers when primary execution fails
     */
    function initiateFailover(
        uint256 intentId,
        string calldata reason
    ) external nonReentrant validIntent(intentId) {
        TransactionIntent storage intent = intents[intentId];
        require(
            intent.status == IntentStatus.FAILED || intent.status == IntentStatus.PENDING,
            "Intent not eligible for failover"
        );
        require(intent.failoverChains.length > 0, "No failover chains configured");
        
        // Get the next best chain based on current conditions
        uint256 targetChainId = _selectBestFailoverChain(intentId);
        require(targetChainId != 0, "No suitable failover chain found");
        
        // Update status
        IntentStatus oldStatus = intent.status;
        intent.status = IntentStatus.PENDING;
        intent.lastAttemptAt = block.timestamp;
        
        emit FailoverInitiated(intentId, block.chainid, targetChainId, reason);
        emit IntentStatusUpdated(intentId, oldStatus, IntentStatus.PENDING, reason);
        
        // Emit event for off-chain relayer to bridge assets via Avail Nexus
        emit CrossChainExecutionRequested(intentId, targetChainId, msg.sender, block.timestamp);
    }

    /**
     * @dev Select the best failover chain based on gas prices and conditions
     * @param intentId The intent ID
     * @return chainId The selected chain ID (0 if none suitable)
     */
    function _selectBestFailoverChain(uint256 intentId) private view returns (uint256) {
        TransactionIntent storage intent = intents[intentId];
        
        // Iterate through failover chains in priority order
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            uint256 chainId = intent.failoverChains[i];
            ChainGasEstimate memory estimate = chainGasEstimates[chainId];
            
            // Check if chain is active and gas price is acceptable
            if (estimate.isActive && estimate.gasPrice <= intent.maxGasPrice) {
                return chainId;
            }
        }
        
        // If no chain meets criteria, return Hedera as ultimate fallback (if configured)
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            if (intent.failoverChains[i] == 296) { // Hedera testnet
                return 296;
            }
        }
        
        return 0; // No suitable chain found
    }

    /**
     * @dev Record cross-chain execution result
     * @param intentId The intent ID
     * @param chainId The chain where execution was attempted
     * @param success Whether execution succeeded
     * @param details Additional details about the execution
     * @notice Called by off-chain relayers after attempting execution on target chain
     */
    function recordCrossChainExecution(
        uint256 intentId,
        uint256 chainId,
        bool success,
        string calldata details
    ) external nonReentrant validIntent(intentId) {
        TransactionIntent storage intent = intents[intentId];
        
        if (success) {
            IntentStatus oldStatus = intent.status;
            intent.status = IntentStatus.COMPLETED;
            emit IntentStatusUpdated(intentId, oldStatus, IntentStatus.COMPLETED, details);
            emit FailoverCompleted(intentId, chainId, true, details);
        } else {
            IntentStatus oldStatus = intent.status;
            intent.status = IntentStatus.FAILED;
            intent.failureReason = details;
            emit IntentStatusUpdated(intentId, oldStatus, IntentStatus.FAILED, details);
            emit FailoverCompleted(intentId, chainId, false, details);
        }
    }

    /**
     * @dev Get optimal chain for execution based on current gas prices
     * @param intentId The intent ID
     * @return chainId The optimal chain ID
     * @return estimatedCost Estimated cost in wei
     */
    function getOptimalChain(uint256 intentId) 
        external 
        view 
        validIntent(intentId) 
        returns (uint256 chainId, uint256 estimatedCost) 
    {
        TransactionIntent storage intent = intents[intentId];
        
        uint256 lowestCost = type(uint256).max;
        uint256 bestChain = 0;
        
        // Check all failover chains
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            uint256 targetChain = intent.failoverChains[i];
            ChainGasEstimate memory estimate = chainGasEstimates[targetChain];
            
            if (estimate.isActive && estimate.gasPrice <= intent.maxGasPrice) {
                uint256 cost = estimate.estimatedGas * estimate.gasPrice;
                if (cost < lowestCost) {
                    lowestCost = cost;
                    bestChain = targetChain;
                }
            }
        }
        
        return (bestChain, lowestCost);
    }

    /**
     * @dev Check if intent is eligible for failover
     * @param intentId The intent ID
     * @return eligible Whether failover is possible
     * @return reason Reason for eligibility status
     */
    function isFailoverEligible(uint256 intentId) 
        external 
        view 
        validIntent(intentId) 
        returns (bool eligible, string memory reason) 
    {
        TransactionIntent storage intent = intents[intentId];
        
        if (intent.status != IntentStatus.FAILED && intent.status != IntentStatus.PENDING) {
            return (false, "Intent not in failed or pending state");
        }
        
        if (block.timestamp > intent.deadline) {
            return (false, "Intent deadline exceeded");
        }
        
        if (intent.failoverChains.length == 0) {
            return (false, "No failover chains configured");
        }
        
        // Check if any failover chain has acceptable gas price
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            uint256 chainId = intent.failoverChains[i];
            ChainGasEstimate memory estimate = chainGasEstimates[chainId];
            
            if (estimate.isActive && estimate.gasPrice <= intent.maxGasPrice) {
                return (true, "Failover chain available");
            }
        }
        
        // Check for Hedera fallback
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            if (intent.failoverChains[i] == 296) {
                return (true, "Hedera fallback available");
            }
        }
        
        return (false, "No suitable failover chain with acceptable gas price");
    }

    /**
     * @dev Get failover chain recommendations for an intent
     * @param intentId The intent ID
     * @return chains Array of recommended chain IDs in priority order
     * @return costs Array of estimated costs for each chain
     */
    function getFailoverRecommendations(uint256 intentId)
        external
        view
        validIntent(intentId)
        returns (uint256[] memory chains, uint256[] memory costs)
    {
        TransactionIntent storage intent = intents[intentId];
        
        // Count eligible chains
        uint256 eligibleCount = 0;
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            uint256 chainId = intent.failoverChains[i];
            if (chainGasEstimates[chainId].isActive) {
                eligibleCount++;
            }
        }
        
        // Allocate arrays
        chains = new uint256[](eligibleCount);
        costs = new uint256[](eligibleCount);
        
        // Populate with eligible chains and their costs
        uint256 index = 0;
        for (uint256 i = 0; i < intent.failoverChains.length; i++) {
            uint256 chainId = intent.failoverChains[i];
            ChainGasEstimate memory estimate = chainGasEstimates[chainId];
            
            if (estimate.isActive) {
                chains[index] = chainId;
                costs[index] = estimate.estimatedGas * estimate.gasPrice;
                index++;
            }
        }
        
        return (chains, costs);
    }
}

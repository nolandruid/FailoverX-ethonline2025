import { ethers } from 'ethers';

// Smart Transaction Scheduler ABI (updated to match deployed contract)
const SMART_SCHEDULER_ABI = [
  // Events
  "event IntentCreated(uint256 indexed intentId, address indexed creator, uint8 actionType, address targetToken, uint256 amount)",
  "event IntentExecuted(uint256 indexed intentId, address indexed executor, uint256 chainId, bool success)",
  "event IntentStatusUpdated(uint256 indexed intentId, uint8 oldStatus, uint8 newStatus, string reason)",
  
  // Main functions
  "function createIntent(address targetToken, uint256 amount, address recipient, uint8 actionType, bytes calldata callData, uint256 executeAfter, uint256 deadline, uint256[] calldata failoverChains, uint256 maxGasPrice, uint256 slippageTolerance) external payable returns (uint256)",
  "function executeIntent(uint256 intentId) external",
  "function cancelIntent(uint256 intentId) external",
  "function getUserIntents(address user) external view returns (uint256[] memory)",
  "function getIntent(uint256 intentId) external view returns (tuple(uint256 id, address creator, address targetToken, uint256 amount, address recipient, uint8 actionType, bytes callData, uint256 executeAfter, uint256 deadline, uint256[] failoverChains, uint256 maxGasPrice, uint256 slippageTolerance, uint8 status, uint256 createdAt))",
  
  // Utility functions
  "function getChainGasEstimate(uint256 chainId) external view returns (tuple(uint256 estimatedGas, uint256 gasPrice))",
  "function getSupportedChains() external view returns (uint256[] memory)",
  "function getTotalIntents() external view returns (uint256)"
];

export interface TransactionIntent {
  id: string;
  user: string;
  actionType: number; // 0=TRANSFER, 1=SWAP, 2=CONTRACT_CALL
  token: string;
  amount: string;
  data: string;
  failoverChains: number[];
  maxGasPrice: string;
  status: number; // 0=PENDING, 1=EXECUTING, 2=COMPLETED, 3=FAILED, 4=CANCELLED
  createdAt: string;
  executedAt: string;
}

export interface CreateIntentParams {
  actionType: number; // 0=TRANSFER, 1=SWAP, 2=CONTRACT_CALL
  token: string;
  amount: string;
  recipient: string; // Required recipient address
  data?: string;
  failoverChains: number[];
  maxGasPrice: string;
  value?: string; // For ETH transfers
}

/**
 * Service for interacting with Smart Transaction Scheduler contract
 */
export class SmartContractService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contractAddress: string | null = null;

  /**
   * Initialize the service with contract address
   */
  async initialize(contractAddress: string): Promise<void> {
    try {
      console.log('🔄 Initializing Smart Contract service...');

      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.contractAddress = contractAddress;

      // Create contract instance
      this.contract = new ethers.Contract(
        contractAddress,
        SMART_SCHEDULER_ABI,
        this.signer
      );

      console.log('✅ Smart Contract service initialized');
      console.log('📋 Contract Address:', contractAddress);
    } catch (error) {
      console.error('❌ Failed to initialize Smart Contract service:', error);
      throw error;
    }
  }

  /**
   * Create a new transaction intent
   */
  async createIntent(params: CreateIntentParams): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔄 Creating transaction intent...', params);

      const txOptions: any = {
        gasLimit: 500000, // Set reasonable gas limit
      };

      // Add value for ETH transfers (when token is zero address, send ETH with transaction)
      if (params.token === ethers.constants.AddressZero && params.amount !== '0') {
        txOptions.value = ethers.utils.parseEther(params.amount);
      } else if (params.value && params.value !== '0') {
        txOptions.value = ethers.utils.parseEther(params.value);
      }

      // Contract function: createIntent(targetToken, amount, recipient, actionType, callData, executeAfter, deadline, failoverChains, maxGasPrice, slippageTolerance)
      const executeAfter = Math.floor(Date.now() / 1000); // Execute immediately
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour deadline
      const slippageTolerance = 300; // 3% slippage tolerance
      
      const tx = await this.contract.createIntent(
        params.token || ethers.constants.AddressZero, // targetToken (use zero address for ETH)
        ethers.utils.parseEther(params.amount), // amount
        params.recipient || ethers.constants.AddressZero, // recipient
        params.actionType, // actionType (0=TRANSFER, 1=SWAP, 2=CONTRACT_CALL)
        params.data || '0x', // callData
        executeAfter, // executeAfter
        deadline, // deadline
        params.failoverChains, // failoverChains
        ethers.utils.parseUnits(params.maxGasPrice, 'gwei'), // maxGasPrice
        slippageTolerance, // slippageTolerance
        txOptions
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract intent ID from events
      const intentCreatedEvent = receipt.events?.find(
        (event: any) => event.event === 'IntentCreated'
      );
      
      const intentId = intentCreatedEvent?.args?.intentId?.toString();
      console.log('✅ Intent created with ID:', intentId);
      
      return intentId || '';
    } catch (error) {
      console.error('❌ Failed to create intent:', error);
      throw error;
    }
  }

  /**
   * Get user's transaction intents
   */
  async getUserIntents(userAddress: string): Promise<TransactionIntent[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔄 Fetching user intents for:', userAddress);

      const intentIds = await this.contract.getUserIntents(userAddress);
      const intents: TransactionIntent[] = [];

      for (const intentId of intentIds) {
        const intent = await this.contract.getIntent(intentId);
        intents.push({
          id: intentId.toString(),
          user: intent.user,
          actionType: intent.actionType,
          token: intent.token,
          amount: ethers.utils.formatEther(intent.amount),
          data: intent.data,
          failoverChains: intent.failoverChains.map((chain: any) => chain.toNumber()),
          maxGasPrice: ethers.utils.formatUnits(intent.maxGasPrice, 'gwei'),
          status: intent.status,
          createdAt: intent.createdAt.toString(),
          executedAt: intent.executedAt.toString(),
        });
      }

      console.log('✅ Found', intents.length, 'intents');
      return intents;
    } catch (error) {
      console.error('❌ Failed to fetch user intents:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction intent (for demo purposes)
   */
  async executeIntent(intentId: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔄 Executing intent:', intentId);

      const tx = await this.contract.executeIntent(intentId, {
        gasLimit: 500000,
      });

      console.log('⏳ Execution transaction submitted:', tx.hash);
      await tx.wait();
      
      console.log('✅ Intent executed successfully');
      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to execute intent:', error);
      throw error;
    }
  }

  /**
   * Cancel a transaction intent
   */
  async cancelIntent(intentId: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔄 Cancelling intent:', intentId);

      const tx = await this.contract.cancelIntent(intentId);
      console.log('⏳ Cancellation transaction submitted:', tx.hash);
      await tx.wait();
      
      console.log('✅ Intent cancelled successfully');
      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to cancel intent:', error);
      throw error;
    }
  }

  /**
   * Get gas estimate for a chain
   */
  async getGasEstimate(chainId: number): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const gasEstimate = await this.contract.getGasEstimate(chainId);
      return ethers.utils.formatUnits(gasEstimate, 'gwei');
    } catch (error) {
      console.error('❌ Failed to get gas estimate:', error);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.contract !== null && this.signer !== null;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string | null {
    return this.contractAddress;
  }
}

// Singleton instance
export const smartContractService = new SmartContractService();

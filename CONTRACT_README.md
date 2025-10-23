# Smart Transaction Scheduler Contract

A Solidity smart contract for scheduling transaction intents with intelligent cross-chain failover routing. This contract is designed for the ETHOnline 2025 hackathon and provides a foundation for preventing users from losing money on failed transactions by automatically routing to cheaper, faster alternative chains.

## Features

### Core Functionality
- **Transaction Intent Creation**: Users can create intents for token transfers, swaps, and contract interactions
- **Intelligent Failover Routing**: Automatic selection of optimal backup chains based on gas prices
- **Cross-chain Execution Tracking**: Monitor and record execution attempts across multiple chains
- **Scheduling**: Set execution windows with earliest and latest timestamps
- **Gas Management**: Real-time gas estimates for different chains
- **Access Control**: Only intent creators can modify their intents

### Supported Action Types
1. **TRANSFER**: Simple token/ETH transfers
2. **SWAP**: DEX swap operations (placeholder for demo)
3. **CONTRACT_CALL**: Generic contract interactions (whitelisted contracts only)

### Failover System
- Users specify ordered list of preferred chains
- Automatic chain selection based on gas prices and conditions
- Static gas estimates stored for: Ethereum Sepolia (11155111), Polygon Mumbai (80001), Arbitrum Sepolia (421614), Optimism Sepolia (11155420), Hedera Testnet (296)
- Off-chain keepers/relayers monitor events and execute based on preferences
- **Hedera as ultimate fallback**: Lowest cost option when all else fails
- **Integration-ready for Avail Nexus SDK**: Events trigger cross-chain bridging via Avail

## Contract Structure

### Main Structs

```solidity
struct TransactionIntent {
    uint256 intentId;
    address creator;
    address targetToken;        // Token address (address(0) for ETH)
    uint256 amount;            // Amount to transfer/swap
    address recipient;         // Target recipient
    ActionType actionType;     // TRANSFER, SWAP, CONTRACT_CALL
    bytes callData;           // For contract interactions
    uint256 executeAfter;     // Earliest execution timestamp
    uint256 deadline;         // Latest execution timestamp
    uint256[] failoverChains; // Chain IDs in priority order
    uint256 maxGasPrice;      // Maximum gas price (wei)
    uint256 slippageTolerance; // For swaps (basis points)
    IntentStatus status;      // Current status
    uint256 createdAt;
    uint256 lastAttemptAt;
    string failureReason;
}
```

### Key Functions

#### User Functions
- `createIntent()`: Create a new transaction intent
- `getIntent()`: Retrieve intent details
- `getUserIntents()`: Get all intents for a user
- `cancelIntent()`: Cancel a pending intent
- `executeIntent()`: Manual execution (for demo)

#### Failover Routing Functions (NEW)
- `initiateFailover()`: Trigger failover to alternative chain
- `recordCrossChainExecution()`: Record execution result from target chain
- `getOptimalChain()`: Get best chain based on current gas prices
- `isFailoverEligible()`: Check if intent can be failed over
- `getFailoverRecommendations()`: Get ranked list of failover options

#### Monitoring Functions (for Keepers)
- `getPendingIntents()`: Get all ready-to-execute intents
- `getSupportedChains()`: Get list of supported chain IDs
- `getChainGasEstimate()`: Get gas estimates for specific chains

#### Admin Functions
- `updateChainGasEstimate()`: Update gas estimates
- `whitelistContract()`: Add contracts for CONTRACT_CALL actions
- `emergencyWithdraw()`: Emergency fund recovery

### Events

#### Core Events
- `IntentCreated`: Emitted when new intent is created
- `IntentStatusUpdated`: Tracks status changes
- `IntentExecuted`: Records execution attempts
- `ChainGasEstimateUpdated`: Gas price updates

#### Failover Events (NEW)
- `FailoverInitiated`: Triggered when failover starts
- `FailoverCompleted`: Records failover result
- `CrossChainExecutionRequested`: Signals off-chain relayer to bridge via Avail

## Setup and Deployment

### Prerequisites
```bash
npm install
```

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy to Local Network
```bash
npx hardhat node
npm run deploy
```

### Deploy to Testnet

#### Single Network Deployment
1. Copy `.env.example` to `.env`
2. Fill in your network URLs and private key
3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

#### Multi-Chain Deployment (Recommended)
Deploy to Sepolia, Base Sepolia, and Hedera Testnet:
```bash
npx hardhat run scripts/deploy-multichain.js
```

This will:
- Deploy to all configured networks
- Save deployment addresses to `deployments.json`
- Display gas estimates for each chain
- Provide next steps for integration

## Integration with PKP System

This contract is designed to work with the existing PKP (Programmable Key Pairs) system:

1. **PKP Creation**: Use existing `index.js` for PKP creation
2. **Intent Creation**: Users create intents through this contract
3. **Off-chain Execution**: PKPs can be used to sign transactions for intent execution
4. **Cross-chain Coordination**: PKPs enable secure cross-chain transaction signing

## Demo Flow

### Basic Flow
1. **User Creates Intent**: Specifies token, amount, recipient, and failover chains
2. **Contract Stores Intent**: Intent stored with PENDING status
3. **Keeper Monitoring**: Off-chain keepers monitor `getPendingIntents()`
4. **Execution Attempt**: Keeper tries primary chain first
5. **Failover Logic**: If primary fails, try next chain in failover list
6. **Status Updates**: Contract emits events for UI updates

### Failover Workflow (NEW)

#### Step 1: Primary Execution Fails
```
User creates intent on Sepolia → Gas spike detected → Transaction fails
```

#### Step 2: Failover Initiated
```javascript
// Off-chain keeper detects failure and calls:
await scheduler.initiateFailover(intentId, "High gas price on Sepolia");

// Emits: FailoverInitiated(intentId, 11155111, 84532, "High gas price")
// Emits: CrossChainExecutionRequested(intentId, 84532, keeper, timestamp)
```

#### Step 3: Cross-Chain Bridging (Frontend)
```javascript
// Frontend listens to CrossChainExecutionRequested event
// Triggers Avail Nexus SDK to bridge assets:
await nexusSDK.bridge({
  token: 'USDC',
  amount: intent.amount,
  chainId: 84532, // Base Sepolia
  sourceChains: [11155111] // From Sepolia
});
```

#### Step 4: Execution on Target Chain
```javascript
// After bridging completes, execute on Base Sepolia
// Record result back to contract:
await scheduler.recordCrossChainExecution(
  intentId,
  84532,
  true,
  "Executed successfully on Base Sepolia"
);

// Emits: FailoverCompleted(intentId, 84532, true, "Success")
```

#### Step 5: Hedera Fallback (If All Else Fails)
```
Base fails → Arbitrum fails → Optimism fails → Route to Hedera (296)
```
- Hedera provides ultra-low gas costs ($0.0001)
- 3-5 second finality
- Ultimate safety net for transaction execution

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Only intent creators can modify their intents
- **Contract Whitelisting**: Only approved contracts for CONTRACT_CALL actions
- **Deadline Enforcement**: Intents expire after deadline
- **Emergency Functions**: Owner can recover funds if needed

## Gas Estimates (Static for Demo)

| Chain | Chain ID | Gas Estimate | Gas Price |
|-------|----------|--------------|-----------|
| Ethereum Sepolia | 11155111 | 21,000 | 20 gwei |
| Polygon Mumbai | 80001 | 21,000 | 30 gwei |
| Arbitrum Sepolia | 421614 | 21,000 | 0.1 gwei |
| Optimism Sepolia | 11155420 | 21,000 | 0.001 gwei |

## Events

- `IntentCreated`: New intent created
- `IntentStatusUpdated`: Status changes (pending → executing → completed/failed)
- `IntentExecuted`: Execution attempt completed
- `ChainGasEstimateUpdated`: Gas estimates updated

## Future Enhancements

- **Dynamic Gas Estimation**: Real-time gas price feeds
- **DEX Integration**: Actual swap implementations
- **Advanced Scheduling**: Recurring transactions, conditional execution
- **Cross-chain Messaging**: Direct chain-to-chain communication
- **Governance**: Decentralized parameter updates

## License

MIT License - Built for ETHOnline 2025 Hackathon

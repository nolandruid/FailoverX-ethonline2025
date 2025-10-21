# Hedera Integration for ETHOnline 2025

This directory contains the Hedera testnet integration for the Smart Transaction Scheduler project.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
yarn install
```

### 2. Configure Environment
1. Copy `.env.example` to `.env` in the `hedera/` directory
2. Fill in your Hedera testnet credentials:
   ```
   HEDERA_ACCOUNT_ID=0.0.XXXXXXX
   HEDERA_PRIVATE_KEY=302e020100300506032b657004220420XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   HEDERA_NETWORK=testnet
   ```

### 3. Test Connection
```bash
yarn hedera:test
```

### 4. Deploy Hello World Contract
```bash
yarn hedera:deploy
```

## 📁 Directory Structure

```
hedera/
├── contracts/
│   └── HelloWorld.sol          # Simple smart contract for testing
├── test-connection.js          # Test Hedera network connection
├── deploy-hello-world.js       # Deploy contract to testnet
├── .env.example               # Environment template
├── .env                       # Your credentials (create this)
└── README.md                  # This file
```

## 🔧 Getting Hedera Testnet Credentials

### Method 1: Hedera Portal
1. Visit [Hedera Portal](https://portal.hedera.com/)
2. Create account and navigate to testnet
3. Generate testnet account and keys

### Method 2: Hedera Faucet
1. Visit [Hedera Testnet Faucet](https://portal.hedera.com/faucet)
2. Request test HBAR for your account

### Method 3: HashPack Wallet
1. Install HashPack wallet extension
2. Create testnet account
3. Use built-in faucet to get test HBAR

## 💰 Getting Test HBAR

- **Official Faucet**: https://portal.hedera.com/faucet
- **Community Faucets**: Check Hedera Discord for additional faucets
- **Minimum Balance**: 10 HBAR recommended for contract deployment

## 🏗️ Smart Contract Deployment Process

Hedera uses a unique two-step deployment process:

1. **File Service**: Store contract bytecode on Hedera File Service
2. **Contract Service**: Create contract instance referencing the stored bytecode

### Deployment Steps:
1. Compile Solidity contract to bytecode
2. Store bytecode using `FileCreateTransaction`
3. Deploy contract using `ContractCreateTransaction`
4. Interact with contract using `ContractCallQuery` or `ContractExecuteTransaction`

## 🧪 Testing Your Setup

Run the connection test to verify everything is working:

```bash
yarn hedera:test
```

Expected output:
```
🔗 Testing Hedera Testnet Connection...

📋 Account ID: 0.0.XXXXXXX
🌐 Network: testnet

💰 Checking account balance...
✅ Account Balance: 100 ℏ
✅ Sufficient balance for contract deployment

🎉 Hedera connection successful!
Ready to deploy smart contracts!
```

## 📋 Contract Interaction Examples

### Query Contract (Read-only)
```javascript
const contractQuery = new ContractCallQuery()
    .setContractId(contractId)
    .setGas(30000)
    .setFunction("getMessage");

const result = await contractQuery.execute(client);
const message = result.getString(0);
```

### Execute Contract Function (Write)
```javascript
const contractExecuteTx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(50000)
    .setFunction("setMessage", new ContractFunctionParameters().addString("New message"));

const contractExecuteSubmit = await contractExecuteTx.execute(client);
const contractExecuteReceipt = await contractExecuteSubmit.getReceipt(client);
```

## 🔗 Integration with Smart Transaction Scheduler

This Hedera integration can be incorporated into your existing Smart Transaction Scheduler to support:

- **Cross-chain transactions** including Hedera
- **Hedera Token Service (HTS)** for token operations
- **Hedera Consensus Service** for transaction ordering
- **Low-cost transactions** with predictable fees

## 🛠️ Troubleshooting

### Common Issues:

1. **"Insufficient balance" error**
   - Ensure you have at least 10 HBAR in your testnet account
   - Check balance with `yarn hedera:test`

2. **"Invalid account ID" error**
   - Verify account ID format: `0.0.XXXXXXX`
   - Ensure account exists on testnet

3. **"Invalid private key" error**
   - Check private key format (DER-encoded hex string)
   - Ensure key corresponds to the account ID

4. **Network connection issues**
   - Verify internet connection
   - Try different Hedera testnet nodes

### Getting Help:
- [Hedera Documentation](https://docs.hedera.com/)
- [Hedera Discord](https://discord.gg/hedera)
- [GitHub Issues](https://github.com/hashgraph/hedera-sdk-js/issues)

## 🎯 Next Steps

1. **Compile Real Contract**: Replace demo bytecode with actual compiled Solidity
2. **Add to Frontend**: Integrate Hedera wallet connection in your React app
3. **Cross-chain Logic**: Extend Smart Transaction Scheduler to include Hedera
4. **HTS Integration**: Add Hedera Token Service for token operations
5. **Production Deploy**: Move to Hedera mainnet when ready

## 📚 Resources

- [Hedera SDK Documentation](https://docs.hedera.com/hedera/sdks-and-apis/sdks)
- [Smart Contract Examples](https://github.com/hashgraph/hedera-smart-contracts)
- [Hedera JSON-RPC Relay](https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay)
- [ETHOnline 2025 Resources](https://ethglobal.com/events/ethonline2025)

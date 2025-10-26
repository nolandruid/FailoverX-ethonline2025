# Smart Contract Deployment Guide for Felipe

## What We Fixed & Why

### 1. **Stack Too Deep Error** ✅ (Already Fixed)
- **Problem**: Solidity compiler error due to too many local variables in the `createIntent` function
- **Solution**: Added `viaIR: true` to `hardhat.config.js` (line 13)
- **Why**: Enables intermediate representation compilation for better variable optimization
- **Status**: ✅ Fixed in the codebase

### 2. **Missing Environment Variables** ❌ (Still Need to Fix)
- **Problem**: Hardhat can't find network URLs and private keys
- **Solution**: Need to create `.env` file with proper credentials
- **Why**: Environment variables keep sensitive data secure and out of git

### 3. **Missing dotenv Configuration** ✅ (Just Fixed)
- **Problem**: Hardhat config wasn't loading environment variables
- **Solution**: Added `require("dotenv").config();` to `hardhat.config.js` (line 2)
- **Why**: This tells Hardhat to read the `.env` file

## Setup Steps for Felipe

### Step 1: Create Environment File
```bash
# In the project root directory
cp .env.example .env
```

### Step 2: Get Required Credentials

#### A. Sepolia RPC URL (Free)
**✅ RECOMMENDED - Tenderly (Tested & Working):**
```
SEPOLIA_URL=https://sepolia.gateway.tenderly.co
```

**Alternative Options:**
- `https://ethereum-sepolia.rpc.subquery.network/public`
- `https://gateway.tenderly.co/public/sepolia`
- `https://ethereum-sepolia.gateway.tatum.io`
- `https://eth-sepolia.public.blastapi.io`

**Note**: Avoid `https://rpc.sepolia.org` and Alchemy public endpoints - they're often rate-limited.

#### B. Private Key (From MetaMask)
⚠️ **IMPORTANT: Use a test wallet only!**

1. Open MetaMask
2. Click 3 dots menu → Account Details
3. Click "Export Private Key"
4. Enter MetaMask password
5. Copy the private key (starts with `0x`)

#### C. Test ETH (Free)
1. Copy your wallet address from MetaMask
2. Go to [sepoliafaucet.com](https://sepoliafaucet.com)
3. Paste wallet address and request test ETH
4. Wait for transaction to confirm

### Step 3: Update .env File
Edit the `.env` file with your credentials:
```bash
# Network URLs (✅ WORKING ENDPOINT)
SEPOLIA_URL=https://sepolia.gateway.tenderly.co
HOLESKY_URL=https://holesky.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Private key for deployment (DO NOT commit real private keys)
PRIVATE_KEY=0x1234567890abcdef... # Your actual private key

# API keys (optional for now)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas reporting
REPORT_GAS=true

# Vincent AI Configuration
VINCENT_APP_ID=your_vincent_app_id

# Smart Contract Addresses (✅ DEPLOYED CONTRACT)
SMART_TRANSACTION_SCHEDULER_ADDRESS=0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F
```

### Step 4: Install Dependencies (if needed)
```bash
npm install dotenv
```

### Step 5: Deploy Contract (✅ ALREADY DEPLOYED)
**Contract is already deployed! Skip this step unless you need to redeploy.**

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**✅ Current Deployment:**
- **Contract Address**: `0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F`
- **Network**: Sepolia Testnet
- **Status**: Live and ready for use

## Do You Need to Do This Every Time?

### ❌ **One-Time Setup (Never Again):**
- Adding `viaIR: true` to hardhat.config.js
- Adding `require("dotenv").config();` to hardhat.config.js
- Creating the `.env` file structure

### ✅ **Per Developer (Felipe Needs To Do):**
- Create his own `.env` file with his credentials
- Get his own test ETH from faucet
- Use his own MetaMask private key

### 🔄 **Per Deployment (When Needed):**
- Get fresh test ETH if balance is low
- Update contract addresses after successful deployment

## Security Notes

1. **Never commit `.env` files** - they're in `.gitignore`
2. **Use test wallets only** - never main wallets with real funds
3. **Private keys are sensitive** - treat like passwords
4. **Test ETH has no value** - it's safe to use

## Troubleshooting

### "Empty string for network URL"
- Check `.env` file exists in project root
- Use the working endpoint: `https://sepolia.gateway.tenderly.co`
- Make sure no extra spaces in the URL

### "Insufficient funds"
- Get more test ETH from faucet
- Check you're on Sepolia network in MetaMask

### "Stack too deep" error
- Should be fixed with `viaIR: true` setting
- If still occurs, try reducing local variables in contract

## What's Next After Successful Deployment?

✅ **Contract is already deployed and ready!**

1. **Contract Address**: `0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F`
2. **View on Etherscan**: [https://sepolia.etherscan.io/address/0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F](https://sepolia.etherscan.io/address/0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F)
3. **Frontend Integration**: Use the contract address in your React app
4. **Test Functions**: Create intents, execute transactions, check status

### **Contract Features Available:**
- ✅ Create transaction intents with cross-chain failover
- ✅ Support for 5 networks (Sepolia, Mumbai, Arbitrum, Optimism, Hedera)
- ✅ Gas estimation for all supported chains
- ✅ Intent status tracking and execution

---

**Questions?** Ask in the team chat or check Hardhat docs at [hardhat.org](https://hardhat.org)

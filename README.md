# Smart Transaction Scheduler with Failover
**ETHOnline 2025 Hackathon Project**

A decentralized system that enables users to schedule blockchain transactions with built-in failover mechanisms.

### ✅ PKP Creation System (Completed)
- **Programmable Key Pairs** using Lit Protocol
- **MetaMask integration** for secure wallet connection
- **Distributed key security** - keys never exist in full anywhere
- **Automated transaction signing** capabilities

### 🆕 Hedera Integration (New!)
- **Hedera testnet support** for low-cost transactions
- **Smart contract deployment** on Hedera network
- **Cross-chain compatibility** with existing PKP system
- **Hedera Token Service (HTS)** integration ready

## 🛠️ Technical Stack

- **Blockchain Integration:** Lit Protocol PKPs, Hedera SDK, ethers.js
- **Frontend:** HTML/JavaScript, MetaMask integration
- **Networks:** Datil testnet (Lit Protocol), Hedera testnet
- **Development:** Node.js v22.9.0

## 🚀 Getting Started

### Prerequisites
- Node.js v19.9.0 or higher
- MetaMask browser extension
- Yarn package manager

### Installation
```bash
# Clone the repository
git clone https://github.com/nolandruid/ethonline2025.git
cd ethonline2025

# Install dependencies
yarn install

# Start development server
python3 -m http.server 8000
```

### Testing PKP Creation
1. Navigate to `http://localhost:8000/pkp-test.html`
2. Click "Test Basic Connection" to verify browser capabilities
3. Click "Test MetaMask" to connect your wallet
4. Create your first PKP for automated transaction signing

### Testing Hedera Integration
1. Set up your Hedera testnet credentials in `hedera/.env`
2. Test connection: `yarn hedera:test`
3. Deploy Hello World contract: `yarn hedera:deploy`
4. See `hedera/README.md` for detailed setup instructions

## 📁 Project Structure

```
ethonline2025/
├── hedera/               # Hedera testnet integration
│   ├── contracts/        # Smart contracts for Hedera
│   ├── deploy-hello-world.js  # Contract deployment script
│   ├── test-connection.js     # Connection testing
│   └── README.md         # Hedera setup guide
├── index.js              # Main PKP creation logic
├── pkp-test.html         # PKP testing interface
├── package.json          # Dependencies and project config
├── notes.md              # Development notes and progress
└── README.md             # Project documentation
```

## 🎮 How It Works

1. **Create PKPs:** Generate distributed key pairs that can sign transactions automatically
2. **Schedule Transactions:** Set up future transactions with specific conditions
3. **Failover Protection:** Backup PKPs ensure transactions execute even if primary fails
4. **Cross-Chain Support:** Schedule transactions across multiple blockchain networks

## 📄 License

MIT License - see LICENSE file for details.

const { Client, AccountBalanceQuery, Hbar } = require("@hashgraph/sdk");
require('dotenv').config({ path: './hedera/.env' });

async function testHederaConnection() {
    console.log("🔗 Testing Hedera Testnet Connection...\n");
    
    try {
        // Validate environment variables
        if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
            throw new Error("Missing required environment variables. Please check your .env file.");
        }
        
        // Create Hedera client for testnet
        const client = Client.forTestnet();
        client.setOperator(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY);
        
        console.log(`📋 Account ID: ${process.env.HEDERA_ACCOUNT_ID}`);
        console.log(`🌐 Network: ${process.env.HEDERA_NETWORK || 'testnet'}\n`);
        
        // Query account balance
        console.log("💰 Checking account balance...");
        const accountBalance = await new AccountBalanceQuery()
            .setAccountId(process.env.HEDERA_ACCOUNT_ID)
            .execute(client);
        
        console.log(`✅ Account Balance: ${accountBalance.hbars.toString()}`);
        
        // Check if account has sufficient balance for contract deployment
        const balanceInTinybars = accountBalance.hbars.toTinybars();
        const minimumBalance = Hbar.fromString("10").toTinybars(); // 10 HBAR minimum
        
        if (balanceInTinybars.gte(minimumBalance)) {
            console.log("✅ Sufficient balance for contract deployment");
        } else {
            console.log("⚠️  Low balance - you may need more test HBAR for contract deployment");
            console.log(`   Recommended minimum: 10 HBAR`);
        }
        
        console.log("\n🎉 Hedera connection successful!");
        console.log("Ready to deploy smart contracts!");
        
        client.close();
        
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        console.log("\n🔧 Troubleshooting tips:");
        console.log("1. Ensure your .env file exists in the hedera/ directory");
        console.log("2. Verify your HEDERA_ACCOUNT_ID format (0.0.XXXXXXX)");
        console.log("3. Check that your HEDERA_PRIVATE_KEY is correct");
        console.log("4. Confirm you have test HBAR in your account");
        process.exit(1);
    }
}

// Run the test
testHederaConnection();

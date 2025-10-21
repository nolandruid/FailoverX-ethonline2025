const {
    Client,
    FileCreateTransaction,
    ContractCreateTransaction,
    ContractFunctionParameters,
    ContractCallQuery,
    Hbar
} = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: './hedera/.env' });

async function deployHelloWorld() {
    console.log("🚀 Deploying Hello World Contract to Hedera Testnet...\n");
    
    try {
        // Create Hedera client
        const client = Client.forTestnet();
        client.setOperator(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY);
        
        console.log(`📋 Deploying from account: ${process.env.HEDERA_ACCOUNT_ID}\n`);
        
        // Check for compiled contract artifacts - try Minimal first
        let artifactsPath = path.join(__dirname, "build", "Minimal.json");
        
        if (!fs.existsSync(artifactsPath)) {
            artifactsPath = path.join(__dirname, "build", "SimpleHello.json");
        }
        
        if (!fs.existsSync(artifactsPath)) {
            artifactsPath = path.join(__dirname, "build", "HelloWorld.json");
        }
        
        if (!fs.existsSync(artifactsPath)) {
            console.log("❌ Compiled contract not found!");
            console.log("Please run 'yarn hedera:compile' first to compile the contract.\n");
            throw new Error("Contract artifacts not found. Run compilation first.");
        }
        
        console.log("📄 Loading compiled contract artifacts...");
        const artifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
        const contractBytecode = artifacts.bytecode;
        
        console.log(`✅ Contract loaded: ${artifacts.contractName}`);
        console.log(`📊 Bytecode size: ${(contractBytecode.length - 2) / 2} bytes\n`);
        
        // Step 1: Store the contract bytecode on Hedera File Service
        console.log("📁 Step 1: Storing contract bytecode on Hedera File Service...");
        
        // Remove 0x prefix if present
        const cleanBytecode = contractBytecode.startsWith('0x') ? contractBytecode.slice(2) : contractBytecode;
        
        const fileCreateTx = new FileCreateTransaction()
            .setContents(cleanBytecode)
            .setKeys([client.operatorPublicKey])
            .setMaxTransactionFee(new Hbar(5)); // Increased fee limit
        
        const fileCreateSubmit = await fileCreateTx.execute(client);
        const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
        const bytecodeFileId = fileCreateReceipt.fileId;
        
        console.log(`✅ Bytecode stored with File ID: ${bytecodeFileId}\n`);
        
        // Step 2: Deploy the contract
        console.log("🏗️  Step 2: Deploying contract...");
        const contractCreateTx = new ContractCreateTransaction()
            .setBytecodeFileId(bytecodeFileId)
            .setGas(1000000) // Much higher gas limit
            .setConstructorParameters(new ContractFunctionParameters())
            .setMaxTransactionFee(new Hbar(20)); // Higher fee limit
        
        const contractCreateSubmit = await contractCreateTx.execute(client);
        const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
        const contractId = contractCreateReceipt.contractId;
        
        console.log(`🎉 Contract deployed successfully!`);
        console.log(`📋 Contract ID: ${contractId}`);
        console.log(`🔗 Transaction Hash: ${contractCreateSubmit.transactionId}\n`);
        
        // Step 3: Test the contract by calling getMessage()
        console.log("🧪 Step 3: Testing contract interaction...");
        try {
            const contractQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(30000)
                .setFunction("getMessage");
            
            const getMessage = await contractQuery.execute(client);
            const message = getMessage.getString(0);
            
            console.log(`✅ Contract call successful!`);
            console.log(`💬 Message from contract: "${message}"\n`);
        } catch (queryError) {
            console.log("⚠️  Contract deployed but query test failed:", queryError.message);
            console.log("This is normal for demo bytecode - the contract is still deployed!\n");
        }
        
        // Save deployment info
        const deploymentInfo = {
            contractId: contractId.toString(),
            fileId: bytecodeFileId.toString(),
            transactionId: contractCreateSubmit.transactionId.toString(),
            deployedAt: new Date().toISOString(),
            network: "testnet",
            deployerAccount: process.env.HEDERA_ACCOUNT_ID,
            abi: artifacts.abi,
            contractName: artifacts.contractName
        };
        
        fs.writeFileSync(
            path.join(__dirname, "deployment-info.json"),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("📄 Deployment info saved to hedera/deployment-info.json");
        console.log("\n🎊 Hello World contract deployment completed successfully!");
        
        client.close();
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        console.log("\n🔧 Troubleshooting tips:");
        console.log("1. Ensure you have sufficient HBAR balance (minimum 10 HBAR recommended)");
        console.log("2. Check your network connection");
        console.log("3. Verify your account credentials in .env file");
        process.exit(1);
    }
}

// Run deployment
deployHelloWorld();

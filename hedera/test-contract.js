const { Client, ContractCallQuery } = require("@hashgraph/sdk");
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './hedera/.env' });

async function testContract() {
    console.log("🧪 Testing deployed Hedera contract...\n");
    
    try {
        // Create Hedera client
        const client = Client.forTestnet();
        client.setOperator(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY);
        
        // Load deployment info
        const deploymentPath = path.join(__dirname, "deployment-info.json");
        if (!fs.existsSync(deploymentPath)) {
            throw new Error("No deployment found. Please deploy a contract first with 'yarn hedera:deploy'");
        }
        
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        console.log(`📋 Testing contract: ${deployment.contractName}`);
        console.log(`🆔 Contract ID: ${deployment.contractId}`);
        console.log(`🌐 Network: ${deployment.network}\n`);
        
        // Test calling the getValue function
        console.log("🔍 Calling getValue() function...");
        
        const contractQuery = new ContractCallQuery()
            .setContractId(deployment.contractId)
            .setGas(30000)
            .setFunction("getValue");
        
        const result = await contractQuery.execute(client);
        const value = result.getUint256(0);
        
        console.log(`✅ Contract call successful!`);
        console.log(`📊 Returned value: ${value.toString()}`);
        
        // Test calling the public value variable
        console.log("\n🔍 Calling value public variable...");
        
        const valueQuery = new ContractCallQuery()
            .setContractId(deployment.contractId)
            .setGas(30000)
            .setFunction("value");
        
        const valueResult = await valueQuery.execute(client);
        const publicValue = valueResult.getUint256(0);
        
        console.log(`✅ Public variable call successful!`);
        console.log(`📊 Public value: ${publicValue.toString()}`);
        
        console.log("\n🎉 Contract interaction test completed successfully!");
        console.log("Your Hedera smart contract is working perfectly!");
        
        client.close();
        
    } catch (error) {
        console.error("❌ Contract test failed:", error.message);
        console.log("\n🔧 Troubleshooting tips:");
        console.log("1. Ensure the contract is deployed (run 'yarn hedera:deploy')");
        console.log("2. Check your network connection");
        console.log("3. Verify the contract ID is correct");
        process.exit(1);
    }
}

// Run the test
testContract();

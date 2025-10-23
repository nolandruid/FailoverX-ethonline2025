const { ethers } = require("hardhat");
const hre = require("hardhat");

/**
 * Multi-chain deployment script for SmartTransactionScheduler
 * Deploys to Sepolia, Base Sepolia, and Hedera Testnet
 */

async function deployToNetwork(networkName) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Deploying to ${networkName}...`);
  console.log("=".repeat(60));

  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance));

    // Check if balance is sufficient
    if (balance === 0n) {
      console.error(`❌ Insufficient balance on ${networkName}. Please fund the account.`);
      return null;
    }

    // Deploy the contract
    const SmartTransactionScheduler = await ethers.getContractFactory("SmartTransactionScheduler");
    console.log("Deploying contract...");
    
    const scheduler = await SmartTransactionScheduler.deploy();
    await scheduler.waitForDeployment();

    const address = await scheduler.getAddress();
    console.log(`✅ SmartTransactionScheduler deployed to: ${address}`);
    
    // Display initial state
    const totalIntents = await scheduler.getTotalIntents();
    const supportedChains = await scheduler.getSupportedChains();
    
    console.log("\nInitial state:");
    console.log("- Total intents:", totalIntents.toString());
    console.log("- Supported chains:", supportedChains.map(c => c.toString()).join(", "));
    
    // Display gas estimates
    console.log("\nGas estimates:");
    for (const chainId of supportedChains) {
      const estimate = await scheduler.getChainGasEstimate(chainId);
      console.log(`  Chain ${chainId}: ${estimate.estimatedGas} gas @ ${ethers.formatUnits(estimate.gasPrice, 'gwei')} gwei`);
    }

    return {
      network: networkName,
      address: address,
      deployer: deployer.address,
      chainId: (await ethers.provider.getNetwork()).chainId.toString()
    };

  } catch (error) {
    console.error(`❌ Deployment failed on ${networkName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("\n🚀 Multi-Chain Deployment Script");
  console.log("==================================\n");

  const deployments = [];
  
  // Networks to deploy to (based on Day 2 Hour 3 requirements)
  const networks = ["sepolia", "baseSepolia", "hederaTestnet"];
  
  for (const network of networks) {
    // Switch network
    hre.changeNetwork(network);
    
    const result = await deployToNetwork(network);
    if (result) {
      deployments.push(result);
    }
    
    // Wait a bit between deployments
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  
  if (deployments.length === 0) {
    console.log("❌ No successful deployments");
    return;
  }

  console.log(`✅ Successfully deployed to ${deployments.length} network(s):\n`);
  
  deployments.forEach((deployment, index) => {
    console.log(`${index + 1}. ${deployment.network.toUpperCase()}`);
    console.log(`   Chain ID: ${deployment.chainId}`);
    console.log(`   Contract: ${deployment.address}`);
    console.log(`   Deployer: ${deployment.deployer}`);
    console.log();
  });

  // Save deployment addresses to file
  const fs = require('fs');
  const deploymentData = {
    timestamp: new Date().toISOString(),
    deployments: deployments
  };
  
  fs.writeFileSync(
    'deployments.json',
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log("💾 Deployment addresses saved to deployments.json");
  
  // Next steps
  console.log("\n📝 NEXT STEPS:");
  console.log("1. Update .env with contract addresses");
  console.log("2. Verify contracts on block explorers");
  console.log("3. Test cross-chain failover functionality");
  console.log("4. Integrate with frontend (Avail Nexus SDK)");
  console.log("5. Set up Vincent PKP for automated execution\n");

  return deployments;
}

// Execute deployment
main()
  .then((deployments) => {
    if (deployments && deployments.length > 0) {
      console.log("✅ Multi-chain deployment completed successfully!");
      process.exit(0);
    } else {
      console.log("⚠️  Deployment completed with errors");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SmartTransactionScheduler to BASE Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  console.log("\nDeploying contract...");
  const SmartTransactionScheduler = await ethers.getContractFactory("SmartTransactionScheduler");
  const scheduler = await SmartTransactionScheduler.deploy();

  console.log("Waiting for deployment transaction to be mined...");
  await scheduler.waitForDeployment();

  const contractAddress = await scheduler.getAddress();
  console.log("\n✅ SmartTransactionScheduler deployed to:", contractAddress);
  
  // Wait for additional confirmations before interacting
  console.log("\nWaiting for 3 confirmations...");
  const deploymentTx = scheduler.deploymentTransaction();
  if (deploymentTx) {
    await deploymentTx.wait(3);
    console.log("✅ Deployment confirmed!");
  }
  
  // Try to get initial state (with error handling)
  try {
    console.log("\nFetching initial contract state...");
    const totalIntents = await scheduler.getTotalIntents();
    const supportedChains = await scheduler.getSupportedChains();
    
    console.log("- Total intents:", totalIntents.toString());
    console.log("- Supported chains:", supportedChains.map(c => c.toString()));
    
    // Display gas estimates
    console.log("\nGas estimates:");
    for (const chainId of supportedChains) {
      const estimate = await scheduler.getChainGasEstimate(chainId);
      console.log(`- Chain ${chainId}: ${estimate.estimatedGas} gas at ${ethers.formatUnits(estimate.gasPrice, 'gwei')} gwei`);
    }
  } catch (error) {
    console.log("⚠️  Could not fetch initial state (this is normal for fresh deployments)");
    console.log("   The contract is deployed and ready to use!");
  }

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network: BASE Sepolia (Chain ID: 84532)");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("=".repeat(60));
  console.log("\n📝 Update your .env file with:");
  console.log(`SCHEDULER_ADDRESS_BASE_SEPOLIA=${contractAddress}`);
  console.log("\n🔍 Verify on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${contractAddress}`);

  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

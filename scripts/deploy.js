const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SmartTransactionScheduler...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy the contract
  const SmartTransactionScheduler = await ethers.getContractFactory("SmartTransactionScheduler");
  const scheduler = await SmartTransactionScheduler.deploy();

  await scheduler.waitForDeployment();

  console.log("SmartTransactionScheduler deployed to:", await scheduler.getAddress());
  
  // Display some initial info
  const totalIntents = await scheduler.getTotalIntents();
  const supportedChains = await scheduler.getSupportedChains();
  
  console.log("Initial state:");
  console.log("- Total intents:", totalIntents.toString());
  console.log("- Supported chains:", supportedChains.map(c => c.toString()));
  
  // Display gas estimates for each chain
  console.log("\nGas estimates:");
  for (const chainId of supportedChains) {
    const estimate = await scheduler.getChainGasEstimate(chainId);
    console.log(`- Chain ${chainId}: ${estimate.estimatedGas} gas at ${ethers.formatUnits(estimate.gasPrice, 'gwei')} gwei`);
  }

  return await scheduler.getAddress();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((address) => {
    console.log(`\nDeployment completed successfully!`);
    console.log(`Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

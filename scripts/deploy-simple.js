const { ethers } = require("hardhat");

async function main() {
  const networkName = (await ethers.provider.getNetwork()).name;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`\nDeploying to ${networkName} (Chain ID: ${chainId})...`);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy the contract
  const SmartTransactionScheduler = await ethers.getContractFactory("SmartTransactionScheduler");
  const scheduler = await SmartTransactionScheduler.deploy();

  await scheduler.waitForDeployment();

  const address = await scheduler.getAddress();
  console.log("✅ SmartTransactionScheduler deployed to:", address);
  console.log("\nDeployment completed successfully!\n");

  return address;
}

main()
  .then((address) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

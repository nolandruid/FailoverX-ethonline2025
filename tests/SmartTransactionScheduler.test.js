const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartTransactionScheduler", function () {
  let scheduler;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const SmartTransactionScheduler = await ethers.getContractFactory("SmartTransactionScheduler");
    scheduler = await SmartTransactionScheduler.deploy();
    await scheduler.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await scheduler.owner()).to.equal(owner.address);
    });

    it("Should initialize with supported chains", async function () {
      const supportedChains = await scheduler.getSupportedChains();
      expect(supportedChains.length).to.be.greaterThan(0);
    });

    it("Should have gas estimates for supported chains", async function () {
      const supportedChains = await scheduler.getSupportedChains();
      for (const chainId of supportedChains) {
        const estimate = await scheduler.getChainGasEstimate(chainId);
        expect(estimate.isActive).to.be.true;
        expect(estimate.estimatedGas).to.be.greaterThan(0);
      }
    });
  });

  describe("Intent Creation", function () {
    it("Should create an ETH transfer intent", async function () {
      const amount = ethers.utils.parseEther("1");
      const executeAfter = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const deadline = executeAfter + 3600; // 1 hour later
      const failoverChains = [11155111, 80001]; // Sepolia, Mumbai
      
      await expect(
        scheduler.connect(user1).createIntent(
          ethers.constants.AddressZero, // ETH
          amount,
          user2.address,
          0, // TRANSFER
          "0x",
          executeAfter,
          deadline,
          failoverChains,
          ethers.utils.parseUnits("50", "gwei"), // max gas price
          100, // 1% slippage
          { value: amount }
        )
      ).to.emit(scheduler, "IntentCreated");
    });

    it("Should fail with invalid parameters", async function () {
      const amount = ethers.utils.parseEther("1");
      const executeAfter = Math.floor(Date.now() / 1000) + 60;
      const deadline = executeAfter + 3600;
      const failoverChains = [11155111];
      
      // Should fail with zero amount
      await expect(
        scheduler.connect(user1).createIntent(
          ethers.constants.AddressZero,
          0, // zero amount
          user2.address,
          0,
          "0x",
          executeAfter,
          deadline,
          failoverChains,
          ethers.utils.parseUnits("50", "gwei"),
          100,
          { value: amount }
        )
      ).to.be.revertedWith("Amount must be greater than 0");
      
      // Should fail with invalid recipient
      await expect(
        scheduler.connect(user1).createIntent(
          ethers.constants.AddressZero,
          amount,
          ethers.constants.AddressZero, // invalid recipient
          0,
          "0x",
          executeAfter,
          deadline,
          failoverChains,
          ethers.utils.parseUnits("50", "gwei"),
          100,
          { value: amount }
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should track user intents", async function () {
      const amount = ethers.utils.parseEther("1");
      const executeAfter = Math.floor(Date.now() / 1000) + 60;
      const deadline = executeAfter + 3600;
      const failoverChains = [11155111];
      
      await scheduler.connect(user1).createIntent(
        ethers.constants.AddressZero,
        amount,
        user2.address,
        0,
        "0x",
        executeAfter,
        deadline,
        failoverChains,
        ethers.utils.parseUnits("50", "gwei"),
        100,
        { value: amount }
      );
      
      const userIntents = await scheduler.getUserIntents(user1.address);
      expect(userIntents.length).to.equal(1);
      expect(userIntents[0]).to.equal(1);
    });
  });

  describe("Intent Management", function () {
    let intentId;
    
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1");
      const executeAfter = Math.floor(Date.now() / 1000) + 60;
      const deadline = executeAfter + 3600;
      const failoverChains = [11155111];
      
      const tx = await scheduler.connect(user1).createIntent(
        ethers.constants.AddressZero,
        amount,
        user2.address,
        0,
        "0x",
        executeAfter,
        deadline,
        failoverChains,
        ethers.utils.parseUnits("50", "gwei"),
        100,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      intentId = receipt.events[0].args.intentId;
    });

    it("Should allow creator to cancel intent", async function () {
      await expect(
        scheduler.connect(user1).cancelIntent(intentId)
      ).to.emit(scheduler, "IntentStatusUpdated");
      
      const intent = await scheduler.getIntent(intentId);
      expect(intent.status).to.equal(4); // CANCELLED
    });

    it("Should not allow non-creator to cancel intent", async function () {
      await expect(
        scheduler.connect(user2).cancelIntent(intentId)
      ).to.be.revertedWith("Not intent creator");
    });

    it("Should retrieve intent details", async function () {
      const intent = await scheduler.getIntent(intentId);
      expect(intent.creator).to.equal(user1.address);
      expect(intent.recipient).to.equal(user2.address);
      expect(intent.status).to.equal(0); // PENDING
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update gas estimates", async function () {
      const chainId = 999999; // Test chain
      const estimatedGas = 25000;
      const gasPrice = ethers.utils.parseUnits("10", "gwei");
      
      await expect(
        scheduler.updateChainGasEstimate(chainId, estimatedGas, gasPrice, true)
      ).to.emit(scheduler, "ChainGasEstimateUpdated");
      
      const estimate = await scheduler.getChainGasEstimate(chainId);
      expect(estimate.estimatedGas).to.equal(estimatedGas);
      expect(estimate.gasPrice).to.equal(gasPrice);
      expect(estimate.isActive).to.be.true;
    });

    it("Should allow owner to whitelist contracts", async function () {
      await scheduler.whitelistContract(user1.address);
      expect(await scheduler.whitelistedContracts(user1.address)).to.be.true;
      
      await scheduler.removeContractFromWhitelist(user1.address);
      expect(await scheduler.whitelistedContracts(user1.address)).to.be.false;
    });

    it("Should not allow non-owner to update gas estimates", async function () {
      await expect(
        scheduler.connect(user1).updateChainGasEstimate(999999, 25000, ethers.utils.parseUnits("10", "gwei"), true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Monitoring Functions", function () {
    it("Should return pending intents", async function () {
      // Create an intent that's ready to execute
      const amount = ethers.utils.parseEther("1");
      const executeAfter = Math.floor(Date.now() / 1000) - 60; // 1 minute ago (ready)
      const deadline = executeAfter + 3600;
      const failoverChains = [11155111];
      
      await scheduler.connect(user1).createIntent(
        ethers.constants.AddressZero,
        amount,
        user2.address,
        0,
        "0x",
        executeAfter,
        deadline,
        failoverChains,
        ethers.utils.parseUnits("50", "gwei"),
        100,
        { value: amount }
      );
      
      const pendingIntents = await scheduler.getPendingIntents();
      expect(pendingIntents.length).to.equal(1);
    });

    it("Should return total intents count", async function () {
      expect(await scheduler.getTotalIntents()).to.equal(0);
      
      const amount = ethers.utils.parseEther("1");
      const executeAfter = Math.floor(Date.now() / 1000) + 60;
      const deadline = executeAfter + 3600;
      const failoverChains = [11155111];
      
      await scheduler.connect(user1).createIntent(
        ethers.constants.AddressZero,
        amount,
        user2.address,
        0,
        "0x",
        executeAfter,
        deadline,
        failoverChains,
        ethers.utils.parseUnits("50", "gwei"),
        100,
        { value: amount }
      );
      
      expect(await scheduler.getTotalIntents()).to.equal(1);
    });
  });
});

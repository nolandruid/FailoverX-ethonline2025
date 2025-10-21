import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LitAuthClient } from "@lit-protocol/lit-auth-client";
import { getAuthIdByAuthMethod } from "@lit-protocol/lit-auth-client";
import { 
  LIT_NETWORK, 
  AUTH_METHOD_SCOPE, 
  AUTH_METHOD_TYPE 
} from "@lit-protocol/constants";
import { ethers } from "ethers";

// Global variables
let litNodeClient;
let contractClient;

/**
 * Initialize Lit Protocol client and connect to network
 */
async function initializeLitClient() {
  console.log("🔄 Initializing Lit Protocol client...");
  
  try {
    // Initialize the Lit client
    litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork: LIT_NETWORK.Datil, // Using Datil testnet
    });
    
    // Connect to the Lit network
    await litNodeClient.connect();
    console.log("✅ Connected to Lit Protocol network");
    
    return litNodeClient;
  } catch (error) {
    console.error("❌ Failed to initialize Lit client:", error);
    throw error;
  }
}

/**
 * Initialize contracts client for PKP operations
 */
async function initializeContractsClient() {
  console.log("🔄 Initializing contracts client...");
  
  try {
    // Check if MetaMask is available
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      contractClient = new LitContracts({
        signer,
        network: LIT_NETWORK.Datil,
      });
      
      await contractClient.connect();
      console.log("✅ Contracts client initialized");
      
      return contractClient;
    } else {
      throw new Error("MetaMask not detected. Please install MetaMask.");
    }
  } catch (error) {
    console.error("❌ Failed to initialize contracts client:", error);
    throw error;
  }
}

/**
 * Connect wallet and get authentication signature
 */
async function connectWallet() {
  console.log("🔄 Connecting wallet...");
  
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      console.log("✅ Wallet connected:", address);
      
      // Get authentication signature
      const authSig = await LitJsSdk.checkAndSignAuthMessage({
        chain: "ethereum",
      });
      
      console.log("✅ Authentication signature obtained");
      return { signer, address, authSig };
    } else {
      throw new Error("MetaMask not detected");
    }
  } catch (error) {
    console.error("❌ Failed to connect wallet:", error);
    throw error;
  }
}

/**
 * Create a new PKP (Programmable Key Pair)
 */
async function createPKP(authSig) {
  console.log("🔄 Creating PKP...");
  
  try {
    // Define the authentication method
    const authMethod = {
      authMethodType: AUTH_METHOD_TYPE.EthWallet,
      accessToken: JSON.stringify(authSig),
    };
    
    // Mint PKP with authentication method and scopes
    const mintInfo = await contractClient.mintWithAuth({
      authMethod: authMethod,
      scopes: [
        AUTH_METHOD_SCOPE.SignAnything,
        AUTH_METHOD_SCOPE.PersonalSign,
      ],
    });
    
    console.log("✅ PKP created successfully!");
    console.log("📋 PKP Details:");
    console.log("  - Token ID:", mintInfo.pkp.tokenId);
    console.log("  - Public Key:", mintInfo.pkp.publicKey);
    console.log("  - ETH Address:", mintInfo.pkp.ethAddress);
    console.log("  - Transaction Hash:", mintInfo.tx.transactionHash);
    
    return mintInfo;
  } catch (error) {
    console.error("❌ Failed to create PKP:", error);
    throw error;
  }
}

/**
 * Main function to orchestrate PKP creation flow
 */
async function main() {
  try {
    console.log("🚀 Starting PKP creation flow...");
    
    // Step 1: Initialize Lit client
    await initializeLitClient();
    
    // Step 2: Connect wallet
    const { authSig } = await connectWallet();
    
    // Step 3: Initialize contracts client
    await initializeContractsClient();
    
    // Step 4: Create PKP
    const pkpInfo = await createPKP(authSig);
    
    console.log("🎉 PKP creation flow completed successfully!");
    return pkpInfo;
    
  } catch (error) {
    console.error("💥 PKP creation flow failed:", error);
  } finally {
    // Clean up: disconnect from Lit network
    if (litNodeClient) {
      await litNodeClient.disconnect();
      console.log("🔌 Disconnected from Lit Protocol network");
    }
  }
}

// Export functions for use in other modules
export {
  initializeLitClient,
  initializeContractsClient,
  connectWallet,
  createPKP,
  main
};

// If running directly (not imported), execute main function
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for testing
  window.litPKP = {
    main,
    initializeLitClient,
    connectWallet,
    createPKP
  };
  console.log("💡 PKP functions available at window.litPKP");
  console.log("💡 Run window.litPKP.main() to start the PKP creation flow");
}


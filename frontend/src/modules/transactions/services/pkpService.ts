import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { 
  AUTH_METHOD_SCOPE, 
  AUTH_METHOD_TYPE 
} from "@lit-protocol/constants";
import { ethers } from "ethers";

// Global variables
let litNodeClient: any = null;
let contractClient: any = null;

export interface PKPInfo {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
  transactionHash: string;
}

export interface PKPCreationResult {
  pkp: PKPInfo;
  tx: {
    transactionHash: string;
  };
}

/**
 * Initialize Lit Protocol client and connect to network
 */
async function initializeLitClient(): Promise<any> {
  console.log("🔄 Initializing Lit Protocol client...");
  
  try {
    if (litNodeClient) {
      return litNodeClient;
    }

    // Initialize the Lit client
    litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork: 'datil-dev', // Using Datil testnet
      debug: false,
      alertWhenUnauthorized: false,
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
async function initializeContractsClient(): Promise<any> {
  console.log("🔄 Initializing contracts client...");
  
  try {
    if (contractClient) {
      return contractClient;
    }

    // Check if MetaMask is available
    if (typeof window !== 'undefined' && window.ethereum) {
      // Create fresh provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      
      // Verify we're connected to the right network
      const network = await provider.getNetwork();
      console.log('🌐 Connected to network:', network.name, 'Chain ID:', network.chainId);
      
      contractClient = new LitContracts({
        signer,
        network: 'datil-dev',
        debug: false,
      });
      
      await contractClient.connect();
      console.log("✅ Contracts client initialized");
      
      return contractClient;
    } else {
      throw new Error("MetaMask not detected. Please install MetaMask.");
    }
  } catch (error) {
    console.error("❌ Failed to initialize contracts client:", error);
    // Reset on error
    contractClient = null;
    throw error;
  }
}

/**
 * Get authentication signature for PKP creation
 */
async function getAuthSignature(): Promise<any> {
  console.log("🔄 Getting authentication signature...");
  
  try {
    // Ensure lit client is connected
    if (!litNodeClient) {
      await initializeLitClient();
    }

    // Get authentication signature with proper parameters
    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: "ethereum",
      nonce: Date.now().toString(), // Use timestamp as nonce
    });
    
    console.log("✅ Authentication signature obtained");
    return authSig;
  } catch (error) {
    console.error("❌ Failed to get auth signature:", error);
    throw error;
  }
}

/**
 * Create a new PKP (Programmable Key Pair)
 */
async function createPKP(authSig: any): Promise<PKPCreationResult> {
  console.log("🔄 Creating PKP...");
  
  try {
    // Ensure contracts client is initialized
    await initializeContractsClient();

    // Define the authentication method
    const authMethod = {
      authMethodType: AUTH_METHOD_TYPE.EthWallet,
      accessToken: JSON.stringify(authSig),
    };

    console.log('🔄 Minting PKP with auth method...');
    
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
 * Main PKP service class
 */
export class PKPService {
  private static instance: PKPService;
  private isInitialized = false;

  static getInstance(): PKPService {
    if (!PKPService.instance) {
      PKPService.instance = new PKPService();
    }
    return PKPService.instance;
  }

  /**
   * Initialize the PKP service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await initializeLitClient();
      await initializeContractsClient();
      this.isInitialized = true;
      console.log("✅ PKP Service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize PKP service:", error);
      throw error;
    }
  }

  /**
   * Create a new PKP for the connected wallet
   */
  async createPKP(): Promise<PKPCreationResult> {
    try {
      // Check if we're on the right network
      await this.checkAndSwitchNetwork();

      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get authentication signature
      const authSig = await getAuthSignature();
      
      // Create PKP
      const pkpResult = await createPKP(authSig);
      
      return pkpResult;
    } catch (error) {
      console.error("❌ PKP creation failed:", error);
      throw error;
    }
  }

  /**
   * Check network and switch to Sepolia if needed
   */
  private async checkAndSwitchNetwork(): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      console.log('🔍 Current chain ID:', currentChainId);
      
      // Sepolia testnet (11155111) is recommended for Lit Protocol
      if (currentChainId !== 11155111) {
        console.log('🔄 Switching to Sepolia testnet for PKP creation...');
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia
          });
          
          // Wait for network change to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('✅ Switched to Sepolia testnet');
          
          // Reset clients after network change
          litNodeClient = null;
          contractClient = null;
          this.isInitialized = false;
          
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Chain not added to MetaMask
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              }],
            });
            
            // Wait and reset after adding network
            await new Promise(resolve => setTimeout(resolve, 2000));
            litNodeClient = null;
            contractClient = null;
            this.isInitialized = false;
          } else {
            throw switchError;
          }
        }
      } else {
        console.log('✅ Already on Sepolia testnet');
      }
    } catch (error) {
      console.error('❌ Failed to check/switch network:', error);
      throw new Error('Network error. Please refresh the page and try again.');
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && litNodeClient && contractClient;
  }

  /**
   * Get the Lit node client
   */
  getLitNodeClient(): any {
    return litNodeClient;
  }

  /**
   * Get the contracts client
   */
  getContractsClient(): any {
    return contractClient;
  }
}

// Export singleton instance
export const pkpService = PKPService.getInstance();

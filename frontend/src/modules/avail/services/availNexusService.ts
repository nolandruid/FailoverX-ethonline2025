// Avail Nexus Service for cross-chain balance queries
let nexusSDKInstance: any = null;
let isInitializing = false;

export class AvailNexusService {
  private sdk: any = null;
  private isInitialized = false;

  /**
   * Initialize the Nexus SDK
   */
  async initialize(ethereumProvider: any): Promise<void> {
    if (this.isInitialized || isInitializing) {
      return;
    }

    try {
      isInitializing = true;

      // Dynamically import the SDK (it's browser-only)
      const { NexusSDK } = await import('@avail-project/nexus');

      // Create SDK instance with testnet configuration
      const nexusSDK = new NexusSDK({
        network: 'testnet'
      });

      // Initialize with MetaMask provider
      await nexusSDK.initialize(ethereumProvider);

      // Set up allowance hook (automatically approve minimum amounts)
      nexusSDK.setOnAllowanceHook(async ({ allow, sources }: any) => {
        const allowances = sources.map(() => 'min');
        allow(allowances);
      });

      // Set up intent hook (auto-approve intents)
      nexusSDK.setOnIntentHook(({ allow }: any) => {
        allow();
      });

      this.sdk = nexusSDK;
      nexusSDKInstance = nexusSDK;
      this.isInitialized = true;

      console.log('✅ Avail Nexus SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Nexus SDK:', error);
      throw error;
    } finally {
      isInitializing = false;
    }
  }

  /**
   * Get unified balances across all supported chains
   */
  async getUnifiedBalances(): Promise<any[]> {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('Nexus SDK is not initialized. Call initialize() first.');
    }

    try {
      const unifiedBalances = await this.sdk.getUnifiedBalances();
      console.log('📊 Unified balances:', unifiedBalances);
      return unifiedBalances;
    } catch (error) {
      console.error('❌ Failed to fetch unified balances:', error);
      throw error;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.sdk !== null;
  }

  /**
   * Get the SDK instance
   */
  getSDK(): any {
    return this.sdk;
  }
}

// Singleton instance
export const availNexusService = new AvailNexusService();

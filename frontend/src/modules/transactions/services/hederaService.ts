import { 
  Client, 
  AccountId, 
  PrivateKey, 
  TransferTransaction, 
  Hbar,
  AccountBalanceQuery
} from '@hashgraph/sdk';

export interface HederaConfig {
  accountId: string;
  privateKey: string;
  network: 'testnet' | 'mainnet';
}

export interface HederaTransferParams {
  toAccountId: string;
  amount: number; // in HBAR
  memo?: string;
}

export interface HederaBalance {
  hbars: string;
  tokens: Record<string, string>;
}

/**
 * Hedera service for cross-chain transactions
 */
export class HederaService {
  private client: Client | null = null;
  private accountId: AccountId | null = null;
  private privateKey: PrivateKey | null = null;
  private isInitialized = false;

  /**
   * Initialize Hedera client
   */
  async initialize(config: HederaConfig): Promise<void> {
    try {
      console.log('🔄 Initializing Hedera client...');

      // Parse account ID and private key
      this.accountId = AccountId.fromString(config.accountId);
      this.privateKey = PrivateKey.fromString(config.privateKey);

      // Create client for testnet or mainnet
      if (config.network === 'testnet') {
        this.client = Client.forTestnet();
      } else {
        this.client = Client.forMainnet();
      }

      // Set operator
      this.client.setOperator(this.accountId, this.privateKey);

      this.isInitialized = true;
      console.log('✅ Hedera client initialized for', config.network);
    } catch (error) {
      console.error('❌ Failed to initialize Hedera client:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(accountId?: string): Promise<HederaBalance> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Hedera client not initialized');
    }

    try {
      const targetAccountId = accountId ? AccountId.fromString(accountId) : this.accountId!;
      
      const balance = await new AccountBalanceQuery()
        .setAccountId(targetAccountId)
        .execute(this.client);

      return {
        hbars: balance.hbars.toString(),
        tokens: balance.tokens ? Object.fromEntries(balance.tokens) : {},
      };
    } catch (error) {
      console.error('❌ Failed to get Hedera balance:', error);
      throw error;
    }
  }

  /**
   * Transfer HBAR to another account
   */
  async transferHbar(params: HederaTransferParams): Promise<string> {
    if (!this.isInitialized || !this.client || !this.accountId || !this.privateKey) {
      throw new Error('Hedera client not initialized');
    }

    try {
      console.log('🔄 Transferring HBAR...', params);

      const transaction = new TransferTransaction()
        .addHbarTransfer(this.accountId, Hbar.fromTinybars(-params.amount * 100_000_000)) // Convert HBAR to tinybars
        .addHbarTransfer(AccountId.fromString(params.toAccountId), Hbar.fromTinybars(params.amount * 100_000_000));

      if (params.memo) {
        transaction.setTransactionMemo(params.memo);
      }

      // Execute transaction
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log('✅ HBAR transfer successful:', txResponse.transactionId?.toString());
      return txResponse.transactionId?.toString() || '';
    } catch (error) {
      console.error('❌ Failed to transfer HBAR:', error);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Get network info
   */
  getNetworkInfo(): { network: string; accountId: string | null } {
    return {
      network: this.client ? 'hedera-testnet' : 'not-connected',
      accountId: this.accountId?.toString() || null,
    };
  }

  /**
   * Disconnect client
   */
  disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.isInitialized = false;
      console.log('🔌 Hedera client disconnected');
    }
  }
}

// Singleton instance
export const hederaService = new HederaService();

import { ethers } from 'ethers';
import { smartContractService } from './smartContractService';
import type { TransactionHistoryItem, TransactionHistoryStatus, FailoverAttempt } from '../types';

/**
 * Chain ID to Name mapping
 */
const CHAIN_NAMES: Record<number, string> = {
  11155111: 'Sepolia',
  80001: 'Mumbai',
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  296: 'Hedera Testnet',
  84532: 'Base Sepolia',
};

/**
 * Get chain name from chain ID
 */
function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

/**
 * Map contract status to history status
 */
function mapContractStatus(status: number): TransactionHistoryStatus {
  switch (status) {
    case 0: return 'PENDING';
    case 1: return 'PENDING'; // EXECUTING
    case 2: return 'SUCCESS'; // COMPLETED
    case 3: return 'FAILED';
    case 4: return 'CANCELLED';
    default: return 'PENDING';
  }
}

/**
 * Service for fetching and processing transaction history
 */
export class TransactionHistoryService {
  private provider: ethers.providers.Web3Provider | null = null;
  private eventCache: Map<string, any[]> = new Map();

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
  }

  /**
   * Get transaction history for a user
   */
  async getUserTransactionHistory(userAddress: string): Promise<TransactionHistoryItem[]> {
    try {
      console.log('📜 Fetching transaction history for:', userAddress);

      // Get user's intents from smart contract
      const intents = await smartContractService.getUserIntents(userAddress);
      
      if (intents.length === 0) {
        console.log('✅ No transaction history found');
        return [];
      }

      console.log(`📊 Processing ${intents.length} intents`);

      // Process each intent into history item
      const historyItems: TransactionHistoryItem[] = [];
      
      for (const intent of intents) {
        try {
          const historyItem = await this.processIntent(intent);
          historyItems.push(historyItem);
        } catch (error) {
          console.error(`❌ Failed to process intent ${intent.id}:`, error);
        }
      }

      // Sort by creation time (newest first)
      historyItems.sort((a, b) => b.createdAt - a.createdAt);

      console.log(`✅ Processed ${historyItems.length} transaction history items`);
      return historyItems;
    } catch (error) {
      console.error('❌ Failed to fetch transaction history:', error);
      throw error;
    }
  }

  /**
   * Process a single intent into a history item
   */
  private async processIntent(intent: any): Promise<TransactionHistoryItem> {
    const intentId = intent.id;
    const primaryChainId = await this.getCurrentChainId();
    
    // Get execution events for this intent
    const executionEvents = await this.getIntentExecutionEvents(intentId);
    
    // Determine token symbol
    const tokenSymbol = this.getTokenSymbol(intent.token);
    
    // Build primary attempt
    const primaryAttempt = {
      txHash: executionEvents.length > 0 ? executionEvents[0].txHash : undefined,
      gasUsed: executionEvents.length > 0 ? executionEvents[0].gasUsed : undefined,
      gasCost: executionEvents.length > 0 ? executionEvents[0].gasCost : undefined,
      status: this.getAttemptStatus(intent.status, executionEvents.length > 0),
      error: intent.status === 3 ? 'Transaction failed' : undefined,
    };

    // Build failover attempts from events
    const failoverAttempts: FailoverAttempt[] = [];
    if (executionEvents.length > 1) {
      for (let i = 1; i < executionEvents.length; i++) {
        const event = executionEvents[i];
        failoverAttempts.push({
          chainId: event.chainId || primaryChainId,
          chainName: getChainName(event.chainId || primaryChainId),
          timestamp: event.timestamp,
          status: event.success ? 'SUCCESS' : 'FAILED',
          txHash: event.txHash,
          gasUsed: event.gasUsed,
          gasCost: event.gasCost,
          error: event.success ? undefined : 'Execution failed',
        });
      }
    }

    // Determine final execution details
    const successfulEvent = executionEvents.find(e => e.success);
    const finalChainId = successfulEvent?.chainId || primaryChainId;
    const finalChainName = getChainName(finalChainId);
    const finalTxHash = successfulEvent?.txHash;

    // Calculate gas savings
    const gasSaved = this.calculateGasSavings(
      executionEvents,
      primaryChainId,
      finalChainId
    );

    // Map action type
    const actionType = intent.actionType === 0 ? 'TRANSFER' : 'SWAP';

    return {
      intentId,
      primaryChainId,
      primaryChainName: getChainName(primaryChainId),
      token: tokenSymbol as any,
      amount: intent.amount,
      action: actionType as any,
      recipient: intent.data !== '0x' ? undefined : ethers.constants.AddressZero,
      status: mapContractStatus(intent.status),
      createdAt: parseInt(intent.createdAt) * 1000, // Convert to milliseconds
      completedAt: intent.status === 2 ? Date.now() : undefined,
      primaryAttempt,
      failoverAttempts,
      finalChainId,
      finalChainName,
      finalTxHash,
      gasSaved,
      maxGasPrice: intent.maxGasPrice,
      failoverChains: intent.failoverChains,
    };
  }

  /**
   * Get execution events for an intent
   */
  private async getIntentExecutionEvents(intentId: string): Promise<any[]> {
    // Check cache first
    const cacheKey = `events_${intentId}`;
    if (this.eventCache.has(cacheKey)) {
      return this.eventCache.get(cacheKey)!;
    }

    try {
      if (!this.provider) {
        await this.initialize();
      }

      const contractAddress = smartContractService.getContractAddress();
      if (!contractAddress) {
        return [];
      }

      // Query IntentExecuted events
      const contract = new ethers.Contract(
        contractAddress,
        [
          'event IntentExecuted(uint256 indexed intentId, address indexed executor, uint256 chainId, bool success)',
        ],
        this.provider!
      );

      const filter = contract.filters.IntentExecuted(intentId);
      const events = await contract.queryFilter(filter);

      // Process events
      const processedEvents = await Promise.all(
        events.map(async (event) => {
          const block = await event.getBlock();
          const receipt = await event.getTransactionReceipt();
          
          return {
            intentId: event.args?.intentId.toString(),
            executor: event.args?.executor,
            chainId: event.args?.chainId?.toNumber(),
            success: event.args?.success,
            txHash: event.transactionHash,
            timestamp: block.timestamp * 1000,
            gasUsed: receipt.gasUsed.toString(),
            gasCost: ethers.utils.formatEther(
              receipt.gasUsed.mul(receipt.effectiveGasPrice)
            ),
          };
        })
      );

      // Cache the results
      this.eventCache.set(cacheKey, processedEvents);

      return processedEvents;
    } catch (error) {
      console.error('❌ Failed to fetch execution events:', error);
      return [];
    }
  }

  /**
   * Get current chain ID
   */
  private async getCurrentChainId(): Promise<number> {
    if (!this.provider) {
      await this.initialize();
    }
    const network = await this.provider!.getNetwork();
    return network.chainId;
  }

  /**
   * Get token symbol from address
   */
  private getTokenSymbol(tokenAddress: string): string {
    const TOKEN_ADDRESSES: Record<string, string> = {
      '0x0000000000000000000000000000000000000000': 'ETH',
      '0xA0b86a33E6441b8435b662f98137B2A0F2F8b8A0': 'USDC',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
    };
    return TOKEN_ADDRESSES[tokenAddress] || 'UNKNOWN';
  }

  /**
   * Get attempt status
   */
  private getAttemptStatus(
    intentStatus: number,
    hasEvents: boolean
  ): 'SUCCESS' | 'FAILED' | 'PENDING' {
    if (intentStatus === 2) return 'SUCCESS';
    if (intentStatus === 3) return 'FAILED';
    if (hasEvents) return 'SUCCESS';
    return 'PENDING';
  }

  /**
   * Calculate gas savings from failover
   */
  private calculateGasSavings(
    events: any[],
    primaryChainId: number,
    finalChainId: number
  ): { amount: string; percentage: number; comparedToChain: string } | undefined {
    if (events.length === 0 || primaryChainId === finalChainId) {
      return undefined;
    }

    // Estimate gas costs for different chains
    const chainGasCosts: Record<number, number> = {
      11155111: 0.005, // Sepolia (estimated)
      80001: 0.001,    // Mumbai (estimated)
      421614: 0.0001,  // Arbitrum Sepolia (estimated)
      11155420: 0.0002, // Optimism Sepolia (estimated)
      296: 0.00001,    // Hedera (estimated)
    };

    const primaryCost = chainGasCosts[primaryChainId] || 0.005;
    const finalCost = chainGasCosts[finalChainId] || 0.001;
    
    if (finalCost >= primaryCost) {
      return undefined;
    }

    const savedAmount = primaryCost - finalCost;
    const percentage = ((savedAmount / primaryCost) * 100);

    return {
      amount: savedAmount.toFixed(6),
      percentage: Math.round(percentage),
      comparedToChain: getChainName(primaryChainId),
    };
  }

  /**
   * Clear event cache
   */
  clearCache(): void {
    this.eventCache.clear();
  }
}

// Singleton instance
export const transactionHistoryService = new TransactionHistoryService();

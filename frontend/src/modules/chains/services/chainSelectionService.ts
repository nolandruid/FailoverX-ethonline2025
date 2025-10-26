import type { GasPrice, ChainConfig, ChainSelection, NetworkCongestion } from '../types';
import { gasPriceService } from './gasPriceService';

export interface TransactionContext {
  type: 'transfer' | 'swap' | 'contract_call';
  amount?: string; // in USD equivalent
  urgency: 'low' | 'medium' | 'high'; // how quickly user needs it
  maxGasPrice?: number; // max willing to pay in Gwei
}

export interface SelectionWeights {
  gasCost: number;     // 0-1, importance of low gas cost
  speed: number;       // 0-1, importance of fast execution
  congestion: number;  // 0-1, importance of avoiding congestion
  reliability: number; // 0-1, importance of success rate
}

// Default weights for different transaction types
const DEFAULT_WEIGHTS: Record<TransactionContext['type'], SelectionWeights> = {
  transfer: {
    gasCost: 0.5,    // Prioritize cost for simple transfers
    speed: 0.2,
    congestion: 0.2,
    reliability: 0.1,
  },
  swap: {
    gasCost: 0.25,   // Balance cost and speed for swaps
    speed: 0.35,
    congestion: 0.25,
    reliability: 0.15,
  },
  contract_call: {
    gasCost: 0.15,   // Prioritize reliability and low congestion
    speed: 0.25,
    congestion: 0.35,
    reliability: 0.25,
  },
};

// Urgency modifiers
const URGENCY_MODIFIERS: Record<TransactionContext['urgency'], Partial<SelectionWeights>> = {
  low: { gasCost: 0.1, speed: -0.1 }, // Prioritize cost over speed
  medium: {}, // Use default weights
  high: { gasCost: -0.1, speed: 0.1 }, // Prioritize speed over cost
};

class ChainSelectionService {
  /**
   * Select the optimal chain for a transaction
   */
  async selectOptimalChain(
    context: TransactionContext,
    customWeights?: Partial<SelectionWeights>
  ): Promise<ChainSelection> {
    const [gasPrices, congestionData] = await Promise.all([
      gasPriceService.getAllGasPrices(),
      gasPriceService.getNetworkCongestion(),
    ]);

    const supportedChains = gasPriceService.getSupportedChains();
    const weights = this.calculateWeights(context, customWeights);

    // Score each chain
    const chainScores = supportedChains.map(chain => {
      const gasPrice = gasPrices.find(gp => gp.chainId === chain.chainId);
      const congestion = congestionData.find(cd => cd.chainId === chain.chainId);

      if (!gasPrice || gasPrice.status !== 'success' || !congestion) {
        return { chain, score: -1, gasPrice: null, congestion: null };
      }

      const score = this.calculateChainScore(chain, gasPrice, congestion, weights, context);
      return { chain, score, gasPrice, congestion };
    });

    // Filter out failed chains and sort by score (higher is better)
    const validChains = chainScores
      .filter(cs => cs.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (validChains.length === 0) {
      throw new Error('No chains available for transaction execution');
    }

    const recommended = validChains[0];
    const alternatives = validChains.slice(1);

    // Calculate gas savings compared to most expensive option
    const gasSavings = this.calculateGasSavings(
      recommended.gasPrice!,
      validChains.map(vc => vc.gasPrice!),
      context
    );

    return {
      recommendedChain: recommended.chain,
      alternativeChains: alternatives.map(alt => alt.chain),
      reasoning: this.generateReasoning(recommended, alternatives[0], context),
      gasSavings,
    };
  }

  /**
   * Calculate weighted score for a chain
   */
  private calculateChainScore(
    chain: ChainConfig,
    gasPrice: GasPrice,
    congestion: NetworkCongestion,
    weights: SelectionWeights,
    context: TransactionContext
  ): number {
    // Normalize gas price (lower is better, so invert)
    const maxGasPrice = Math.max(50, context.maxGasPrice || 50); // Cap at reasonable max
    const gasCostScore = Math.max(0, 1 - parseFloat(gasPrice.gasPrice) / maxGasPrice);

    // Normalize speed (lower block time is better, so invert)
    const maxBlockTime = 15; // seconds
    const speedScore = Math.max(0, 1 - chain.blockTime / maxBlockTime);

    // Normalize congestion (lower is better, so invert)
    const congestionScore = Math.max(0, 1 - congestion.congestionScore / 100);

    // Reliability score (simplified - could be enhanced with historical data)
    const reliabilityScore = this.getReliabilityScore(chain.chainId);

    // Calculate weighted score
    const totalScore = 
      (gasCostScore * weights.gasCost) +
      (speedScore * weights.speed) +
      (congestionScore * weights.congestion) +
      (reliabilityScore * weights.reliability);

    return totalScore;
  }

  /**
   * Calculate selection weights based on context
   */
  private calculateWeights(
    context: TransactionContext,
    customWeights?: Partial<SelectionWeights>
  ): SelectionWeights {
    const baseWeights = { ...DEFAULT_WEIGHTS[context.type] };
    const urgencyModifier = URGENCY_MODIFIERS[context.urgency];

    // Apply urgency modifiers
    Object.entries(urgencyModifier).forEach(([key, modifier]) => {
      if (modifier !== undefined) {
        baseWeights[key as keyof SelectionWeights] += modifier;
      }
    });

    // Apply custom weights
    const finalWeights = { ...baseWeights, ...customWeights };

    // Normalize weights to sum to 1
    const total = Object.values(finalWeights).reduce((sum, weight) => sum + weight, 0);
    Object.keys(finalWeights).forEach(key => {
      finalWeights[key as keyof SelectionWeights] /= total;
    });

    return finalWeights;
  }

  /**
   * Get reliability score for a chain (simplified)
   */
  private getReliabilityScore(chainId: number): number {
    // Reliability scores based on maturity and track record
    const reliabilityMap: Record<number, number> = {
      11155111: 0.95,  // Ethereum Sepolia - most battle-tested
      84532: 0.88,     // Base Sepolia - newer but Coinbase-backed
      421614: 0.92,    // Arbitrum Sepolia - proven L2 tech
      11155420: 0.90,  // Optimism Sepolia - established L2
      296: 0.93,       // Hedera - enterprise-grade but different consensus
    };

    return reliabilityMap[chainId] || 0.7;
  }

  /**
   * Calculate gas savings compared to alternatives
   */
  private calculateGasSavings(
    recommendedGasPrice: GasPrice,
    allGasPrices: GasPrice[],
    context: TransactionContext
  ): { amount: string; percentage: number } | undefined {
    // Find the most expensive alternative
    const sortedByPrice = allGasPrices
      .filter(gp => gp.chainId !== recommendedGasPrice.chainId)
      .sort((a, b) => parseFloat(b.gasPrice) - parseFloat(a.gasPrice));

    if (sortedByPrice.length === 0) {
      return undefined;
    }

    const mostExpensive = sortedByPrice[0];
    const recommendedPrice = parseFloat(recommendedGasPrice.gasPrice);
    const expensivePrice = parseFloat(mostExpensive.gasPrice);

    if (recommendedPrice >= expensivePrice) {
      return undefined; // No savings
    }

    const savingsGwei = expensivePrice - recommendedPrice;
    const savingsPercentage = Math.round((savingsGwei / expensivePrice) * 100);

    // Estimate transaction cost (simplified)
    const estimatedGasUnits = this.estimateGasUnits(context.type);
    const savingsWei = savingsGwei * 1e9 * estimatedGasUnits;
    const savingsEth = savingsWei / 1e18;

    return {
      amount: `${savingsEth.toFixed(6)} ${recommendedGasPrice.symbol}`,
      percentage: savingsPercentage,
    };
  }

  /**
   * Estimate gas units for different transaction types
   */
  private estimateGasUnits(type: TransactionContext['type']): number {
    const gasEstimates = {
      transfer: 21000,
      swap: 150000,
      contract_call: 100000,
    };

    return gasEstimates[type];
  }

  /**
   * Generate human-readable reasoning for the selection
   */
  private generateReasoning(
    recommended: any,
    alternative: any | undefined,
    context: TransactionContext
  ): string {
    const reasons: string[] = [];

    // Gas cost reasoning
    const gasPrice = parseFloat(recommended.gasPrice.gasPrice);
    if (gasPrice < 1) {
      reasons.push(`ultra-low gas (${gasPrice.toFixed(4)} Gwei)`);
    } else if (gasPrice < 10) {
      reasons.push(`low gas cost (${gasPrice.toFixed(2)} Gwei)`);
    }

    // Speed reasoning
    if (recommended.chain.blockTime <= 3) {
      reasons.push(`fast finality (${recommended.chain.blockTime}s)`);
    }

    // Congestion reasoning
    if (recommended.congestion.level === 'low') {
      reasons.push('low network congestion');
    }

    // Comparison with alternative
    if (alternative) {
      const altGasPrice = parseFloat(alternative.gasPrice.gasPrice);
      const gasDiff = altGasPrice - gasPrice;
      if (gasDiff > 1) {
        const percentage = Math.round((gasDiff / altGasPrice) * 100);
        reasons.push(`${percentage}% cheaper than ${alternative.chain.name}`);
      }
    }

    return reasons.length > 0 
      ? reasons.join(', ')
      : `optimal for ${context.type} transactions`;
  }

  /**
   * Get quick recommendation for common scenarios
   */
  async getQuickRecommendation(scenario: 'cheapest' | 'fastest' | 'balanced'): Promise<ChainSelection> {
    const contextMap: Record<typeof scenario, TransactionContext> = {
      cheapest: { type: 'transfer', urgency: 'low' },
      fastest: { type: 'swap', urgency: 'high' },
      balanced: { type: 'contract_call', urgency: 'medium' },
    };

    return this.selectOptimalChain(contextMap[scenario]);
  }
}

export const chainSelectionService = new ChainSelectionService();

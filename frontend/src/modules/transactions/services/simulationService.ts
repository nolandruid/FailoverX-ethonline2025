import type { GasPrice, NetworkCongestion, ChainConfig } from '../../chains/types';
import type { TransactionContext } from '../../chains/services/chainSelectionService';
import { gasPriceService } from '../../chains/services/gasPriceService';

export interface TransactionSimulation {
  chainId: number;
  chainName: string;
  successProbability: number; // 0-100
  estimatedGasCost: string; // in native token
  estimatedGasCostUSD: string; // in USD
  executionTime: string; // estimated time to completion
  riskFactors: RiskFactor[];
  recommendation: SimulationRecommendation;
  timestamp: number;
}

export interface RiskFactor {
  type: 'gas_price' | 'network_congestion' | 'slippage' | 'insufficient_balance' | 'contract_risk';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // 0-100, impact on success probability
}

export interface SimulationRecommendation {
  action: 'execute_now' | 'wait_for_better_conditions' | 'switch_chain' | 'increase_gas' | 'reduce_amount';
  reasoning: string;
  alternativeChain?: number; // chainId
  suggestedGasPrice?: number; // in Gwei
  estimatedWaitTime?: number; // in minutes
}

export interface SimulationContext extends TransactionContext {
  fromAddress?: string;
  toAddress?: string;
  value?: string; // in ETH/native token
  gasLimit?: number;
  gasPrice?: number; // in Gwei
  data?: string; // contract call data
}

class TransactionSimulationService {
  private readonly USD_RATES = {
    ETH: 2500, // Simplified USD rates
    HBAR: 0.08,
  };

  /**
   * Simulate transaction execution across all chains
   */
  async simulateTransaction(context: SimulationContext): Promise<TransactionSimulation[]> {
    const [gasPrices, congestionData] = await Promise.all([
      gasPriceService.getAllGasPrices(),
      gasPriceService.getNetworkCongestion(),
    ]);

    const supportedChains = gasPriceService.getSupportedChains();

    const simulations = await Promise.all(
      supportedChains.map(chain => 
        this.simulateOnChain(chain, context, gasPrices, congestionData)
      )
    );

    // Sort by success probability (highest first)
    return simulations
      .filter(sim => sim.successProbability > 0)
      .sort((a, b) => b.successProbability - a.successProbability);
  }

  /**
   * Simulate transaction on a specific chain
   */
  async simulateOnChain(
    chain: ChainConfig,
    context: SimulationContext,
    gasPrices: GasPrice[],
    congestionData: NetworkCongestion[]
  ): Promise<TransactionSimulation> {
    const gasPrice = gasPrices.find(gp => gp.chainId === chain.chainId);
    const congestion = congestionData.find(cd => cd.chainId === chain.chainId);

    if (!gasPrice || gasPrice.status !== 'success' || !congestion) {
      return this.createFailedSimulation(chain, 'Network unavailable');
    }

    // Calculate success probability
    const successProbability = this.calculateSuccessProbability(
      chain, gasPrice, congestion, context
    );

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(
      chain, gasPrice, congestion, context
    );

    // Calculate costs
    const { gasCost, gasCostUSD } = this.calculateGasCosts(
      chain, gasPrice, context
    );

    // Estimate execution time
    const executionTime = this.estimateExecutionTime(
      chain, congestion, context
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      chain, gasPrice, congestion, context, successProbability, riskFactors
    );

    return {
      chainId: chain.chainId,
      chainName: chain.name,
      successProbability: Math.round(successProbability),
      estimatedGasCost: gasCost,
      estimatedGasCostUSD: gasCostUSD,
      executionTime,
      riskFactors,
      recommendation,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate success probability based on multiple factors
   */
  private calculateSuccessProbability(
    chain: ChainConfig,
    gasPrice: GasPrice,
    congestion: NetworkCongestion,
    context: SimulationContext
  ): number {
    let baseProbability = 95; // Start with high base probability

    // Gas price factor
    const currentGasPrice = parseFloat(gasPrice.gasPrice);
    const userGasPrice = context.gasPrice || currentGasPrice * 1.1; // 10% buffer if not specified
    
    if (userGasPrice < currentGasPrice * 0.8) {
      baseProbability -= 30; // Low gas price = high failure risk
    } else if (userGasPrice < currentGasPrice) {
      baseProbability -= 15; // Slightly low gas price
    }

    // Network congestion factor
    if (congestion.level === 'high') {
      baseProbability -= 20;
    } else if (congestion.level === 'medium') {
      baseProbability -= 10;
    }

    // Transaction complexity factor
    if (context.type === 'contract_call') {
      baseProbability -= 10; // Contract calls are riskier
      if (context.data && context.data.length > 1000) {
        baseProbability -= 5; // Complex contract calls
      }
    } else if (context.type === 'swap') {
      baseProbability -= 5; // DEX swaps have slippage risk
    }

    // Chain-specific reliability
    const chainReliability = this.getChainReliability(chain.chainId);
    baseProbability = baseProbability * chainReliability;

    // Amount factor (large amounts are riskier)
    if (context.value && parseFloat(context.value) > 10) {
      baseProbability -= 5;
    }

    return Math.max(0, Math.min(100, baseProbability));
  }

  /**
   * Identify potential risk factors
   */
  private identifyRiskFactors(
    chain: ChainConfig,
    gasPrice: GasPrice,
    congestion: NetworkCongestion,
    context: SimulationContext
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Gas price risks
    const currentGasPrice = parseFloat(gasPrice.gasPrice);
    const userGasPrice = context.gasPrice || currentGasPrice * 1.1;

    if (userGasPrice < currentGasPrice * 0.9) {
      risks.push({
        type: 'gas_price',
        severity: userGasPrice < currentGasPrice * 0.7 ? 'high' : 'medium',
        description: `Gas price ${userGasPrice.toFixed(2)} Gwei is below network average ${currentGasPrice.toFixed(2)} Gwei`,
        impact: userGasPrice < currentGasPrice * 0.7 ? 30 : 15,
      });
    }

    // Network congestion risks
    if (congestion.level === 'high') {
      risks.push({
        type: 'network_congestion',
        severity: 'high',
        description: `Network is heavily congested (${congestion.congestionScore}% capacity)`,
        impact: 20,
      });
    } else if (congestion.level === 'medium') {
      risks.push({
        type: 'network_congestion',
        severity: 'medium',
        description: `Moderate network congestion may cause delays`,
        impact: 10,
      });
    }

    // Transaction type risks
    if (context.type === 'swap') {
      risks.push({
        type: 'slippage',
        severity: 'medium',
        description: 'DEX swaps may fail due to price slippage',
        impact: 8,
      });
    }

    if (context.type === 'contract_call') {
      risks.push({
        type: 'contract_risk',
        severity: 'medium',
        description: 'Smart contract interactions may fail due to logic errors',
        impact: 10,
      });
    }

    return risks;
  }

  /**
   * Calculate estimated gas costs
   */
  private calculateGasCosts(
    chain: ChainConfig,
    gasPrice: GasPrice,
    context: SimulationContext
  ): { gasCost: string; gasCostUSD: string } {
    const gasUnits = this.estimateGasUnits(context);
    const gasPriceGwei = parseFloat(gasPrice.gasPrice);
    const gasPriceWei = gasPriceGwei * 1e9;
    
    const totalGasWei = gasUnits * gasPriceWei;
    const totalGasEth = totalGasWei / 1e18;
    
    const symbol = chain.symbol;
    const usdRate = this.USD_RATES[symbol as keyof typeof this.USD_RATES] || 1;
    const gasCostUSD = totalGasEth * usdRate;

    return {
      gasCost: `${totalGasEth.toFixed(6)} ${symbol}`,
      gasCostUSD: `$${gasCostUSD.toFixed(2)}`,
    };
  }

  /**
   * Estimate gas units needed for transaction
   */
  private estimateGasUnits(context: SimulationContext): number {
    if (context.gasLimit) return context.gasLimit;

    const baseGasEstimates = {
      transfer: 21000,
      swap: 150000,
      contract_call: 100000,
    };

    let gasEstimate = baseGasEstimates[context.type];

    // Adjust for transaction complexity
    if (context.data && context.data.length > 100) {
      gasEstimate += Math.floor(context.data.length / 2); // Rough estimate for data
    }

    return gasEstimate;
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(
    chain: ChainConfig,
    congestion: NetworkCongestion,
    context: SimulationContext
  ): string {
    let baseTime = chain.blockTime;

    // Adjust for congestion
    if (congestion.level === 'high') {
      baseTime *= 3;
    } else if (congestion.level === 'medium') {
      baseTime *= 1.5;
    }

    // Adjust for transaction type
    if (context.type === 'contract_call') {
      baseTime *= 1.2; // Contract calls may need more confirmations
    }

    if (baseTime < 60) {
      return `${Math.round(baseTime)}s`;
    } else {
      return `${Math.round(baseTime / 60)}m`;
    }
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(
    chain: ChainConfig,
    gasPrice: GasPrice,
    congestion: NetworkCongestion,
    context: SimulationContext,
    successProbability: number,
    riskFactors: RiskFactor[]
  ): SimulationRecommendation {
    if (successProbability >= 85) {
      return {
        action: 'execute_now',
        reasoning: 'High success probability with current conditions',
      };
    }

    if (successProbability >= 70) {
      const gasRisk = riskFactors.find(r => r.type === 'gas_price');
      if (gasRisk) {
        const currentGasPrice = parseFloat(gasPrice.gasPrice);
        return {
          action: 'increase_gas',
          reasoning: 'Increase gas price to improve success probability',
          suggestedGasPrice: currentGasPrice * 1.2,
        };
      }
    }

    if (congestion.level === 'high') {
      return {
        action: 'wait_for_better_conditions',
        reasoning: 'Network is congested. Wait for lower congestion to improve success rate',
        estimatedWaitTime: 15,
      };
    }

    return {
      action: 'switch_chain',
      reasoning: 'Consider using an alternative chain for better success rate',
    };
  }

  /**
   * Get chain reliability factor
   */
  private getChainReliability(chainId: number): number {
    const reliabilityMap: Record<number, number> = {
      11155111: 0.98, // Ethereum Sepolia
      84532: 0.95,    // Base Sepolia
      421614: 0.96,   // Arbitrum Sepolia
      11155420: 0.94, // Optimism Sepolia
      295: 0.97,      // Hedera Testnet
    };

    return reliabilityMap[chainId] || 0.9;
  }

  /**
   * Create failed simulation result
   */
  private createFailedSimulation(chain: ChainConfig, reason: string): TransactionSimulation {
    return {
      chainId: chain.chainId,
      chainName: chain.name,
      successProbability: 0,
      estimatedGasCost: '0',
      estimatedGasCostUSD: '$0.00',
      executionTime: 'N/A',
      riskFactors: [{
        type: 'network_congestion',
        severity: 'high',
        description: reason,
        impact: 100,
      }],
      recommendation: {
        action: 'switch_chain',
        reasoning: reason,
      },
      timestamp: Date.now(),
    };
  }
}

export const transactionSimulationService = new TransactionSimulationService();

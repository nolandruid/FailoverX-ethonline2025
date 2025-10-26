import type { GasPrice, ChainConfig, NetworkCongestion } from '../types';

// Multi-chain ecosystem: Ethereum L1 + Popular L2s + Hedera alternative
const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    symbol: 'ETH',
    blockTime: 12,
    congestionThreshold: 15, // 15 Gwei
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    symbol: 'ETH',
    blockTime: 2,
    congestionThreshold: 0.8, // Higher to create competition
  },
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    symbol: 'ETH',
    blockTime: 1, // Very fast
    congestionThreshold: 0.3, // Lower gas threshold
  },
  {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    symbol: 'ETH',
    blockTime: 2,
    congestionThreshold: 0.6, // Moderate
  },
  {
    chainId: 295,
    name: 'Hedera Testnet',
    rpcUrl: 'https://testnet.hashio.io/api',
    symbol: 'HBAR',
    blockTime: 3,
    congestionThreshold: 0.001, // Ultra-low
  },
];

class GasPriceService {
  private gasPriceCache: Map<number, GasPrice> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get current gas price for a specific chain
   */
  async getGasPriceForChain(chainConfig: ChainConfig): Promise<GasPrice> {
    const cacheKey = chainConfig.chainId;
    const cached = this.gasPriceCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Special case: Hedera uses HBAR, not ETH gas pricing
      // Hedera transactions cost ~$0.0001 USD (≈0.0005 HBAR)
      // We use a fixed low estimate since Hedera doesn't use Gwei
      if (chainConfig.chainId === 295) {
        const hederaGasPrice: GasPrice = {
          chainId: chainConfig.chainId,
          chainName: chainConfig.name,
          gasPrice: '0.0005', // Approximate HBAR cost per transaction
          gasPriceWei: '0xF4240', // 1,000,000 wei equivalent
          symbol: chainConfig.symbol,
          rpcUrl: chainConfig.rpcUrl,
          timestamp: Date.now(),
          status: 'success',
          displayUnit: 'HBAR',
          estimatedUSD: 0.0001, // ~$0.0001 per transaction
        };
        
        this.gasPriceCache.set(cacheKey, hederaGasPrice);
        return hederaGasPrice;
      }

      const response = await fetch(chainConfig.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch gas price');
      }

      const gasPriceWei = data.result;
      const gasPriceGwei = this.weiToGwei(gasPriceWei);
      const estimatedUSD = this.estimateUSDCost(parseFloat(gasPriceGwei), chainConfig.chainId);

      const gasPrice: GasPrice = {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        gasPrice: gasPriceGwei,
        gasPriceWei,
        symbol: chainConfig.symbol,
        rpcUrl: chainConfig.rpcUrl,
        timestamp: Date.now(),
        status: 'success',
        displayUnit: 'Gwei',
        estimatedUSD,
      };

      // Cache the result
      this.gasPriceCache.set(cacheKey, gasPrice);
      return gasPrice;

    } catch (error) {
      console.error(`Failed to fetch gas price for ${chainConfig.name}:`, error);
      
      const errorGasPrice: GasPrice = {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        gasPrice: '0',
        gasPriceWei: '0x0',
        symbol: chainConfig.symbol,
        rpcUrl: chainConfig.rpcUrl,
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return errorGasPrice;
    }
  }

  /**
   * Get gas prices for all supported chains
   */
  async getAllGasPrices(): Promise<GasPrice[]> {
    const gasPricePromises = SUPPORTED_CHAINS.map(chain => 
      this.getGasPriceForChain(chain)
    );

    const gasPrices = await Promise.all(gasPricePromises);
    
    // Sort by USD cost (lowest first) for fair cross-chain comparison
    return gasPrices.sort((a, b) => {
      if (a.status === 'error' && b.status === 'success') return 1;
      if (a.status === 'success' && b.status === 'error') return -1;
      if (a.status === 'error' && b.status === 'error') return 0;
      
      // Compare by USD cost if available, otherwise fall back to raw gas price
      const aCost = a.estimatedUSD ?? parseFloat(a.gasPrice);
      const bCost = b.estimatedUSD ?? parseFloat(b.gasPrice);
      
      return aCost - bCost;
    });
  }

  /**
   * Get network congestion level for each chain
   */
  async getNetworkCongestion(): Promise<NetworkCongestion[]> {
    const gasPrices = await this.getAllGasPrices();
    
    return gasPrices.map(gasPrice => {
      const chainConfig = SUPPORTED_CHAINS.find(c => c.chainId === gasPrice.chainId)!;
      const currentGasPrice = parseFloat(gasPrice.gasPrice);
      const threshold = chainConfig.congestionThreshold;
      
      let level: 'low' | 'medium' | 'high';
      let congestionScore: number;
      
      if (currentGasPrice <= threshold) {
        level = 'low';
        congestionScore = Math.min(30, (currentGasPrice / threshold) * 30);
      } else if (currentGasPrice <= threshold * 2) {
        level = 'medium';
        congestionScore = 30 + ((currentGasPrice - threshold) / threshold) * 35;
      } else {
        level = 'high';
        congestionScore = Math.min(100, 65 + ((currentGasPrice - threshold * 2) / threshold) * 35);
      }

      return {
        chainId: gasPrice.chainId,
        level,
        currentGasPrice,
        averageGasPrice: threshold,
        congestionScore: Math.round(congestionScore),
      };
    });
  }

  /**
   * Get the cheapest chain for transaction execution
   */
  async getCheapestChain(): Promise<GasPrice | null> {
    const gasPrices = await this.getAllGasPrices();
    const successfulPrices = gasPrices.filter(gp => gp.status === 'success');
    
    if (successfulPrices.length === 0) return null;
    
    return successfulPrices[0]; // Already sorted by price
  }

  /**
   * Get chain configurations
   */
  getSupportedChains(): ChainConfig[] {
    return [...SUPPORTED_CHAINS];
  }

  /**
   * Estimate USD cost for a transaction based on gas price
   * Uses approximate ETH price and typical transaction gas usage
   */
  private estimateUSDCost(gasPriceGwei: number, chainId: number): number {
    // Approximate ETH price in USD (mock for demo)
    const ethPriceUSD = 2500;
    
    // Typical gas usage for a simple transfer
    const gasUnits = 21000;
    
    // Calculate cost: (gasPrice in Gwei * gasUnits * ETH price) / 1e9
    const costInETH = (gasPriceGwei * gasUnits) / 1e9;
    const costInUSD = costInETH * ethPriceUSD;
    
    return costInUSD;
  }

  /**
   * Convert Wei to Gwei
   */
  private weiToGwei(weiHex: string): string {
    const wei = BigInt(weiHex);
    const gwei = Number(wei) / 1e9;
    return gwei.toFixed(4);
  }

  /**
   * Convert Gwei to Wei
   */
  gweiToWei(gwei: number): string {
    const wei = BigInt(Math.round(gwei * 1e9));
    return `0x${wei.toString(16)}`;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.gasPriceCache.clear();
  }
}

export const gasPriceService = new GasPriceService();

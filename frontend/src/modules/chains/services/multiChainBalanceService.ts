// Service to query balances across multiple chains directly

export interface ChainBalance {
  chainId: number;
  chainName: string;
  nativeBalance: string; // ETH, MATIC, HBAR, etc.
  nativeSymbol: string;
  isCurrentChain: boolean;
}

const SUPPORTED_CHAINS = [
  {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    symbol: 'ETH',
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    symbol: 'ETH',
  },
  {
    chainId: 295,
    name: 'Hedera Testnet',
    rpcUrl: 'https://testnet.hashio.io/api',
    symbol: 'HBAR',
  },
];

class MultiChainBalanceService {
  /**
   * Get balance for a specific chain via RPC
   */
  async getBalanceForChain(
    address: string,
    chainId: number,
    rpcUrl: string
  ): Promise<string> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error(`Error fetching balance for chain ${chainId}:`, data.error);
        return '0';
      }

      // Convert from Wei to ETH
      const balanceWei = BigInt(data.result);
      const balanceEth = Number(balanceWei) / 1e18;

      return balanceEth.toFixed(4);
    } catch (error) {
      console.error(`Failed to fetch balance for chain ${chainId}:`, error);
      return '0';
    }
  }

  /**
   * Get balances across all supported chains
   */
  async getBalancesAcrossChains(
    address: string,
    currentChainId: number
  ): Promise<ChainBalance[]> {
    const balancePromises = SUPPORTED_CHAINS.map(async (chain) => {
      const balance = await this.getBalanceForChain(address, chain.chainId, chain.rpcUrl);

      return {
        chainId: chain.chainId,
        chainName: chain.name,
        nativeBalance: balance,
        nativeSymbol: chain.symbol,
        isCurrentChain: chain.chainId === currentChainId,
      };
    });

    const balances = await Promise.all(balancePromises);

    // Sort by balance (highest first)
    return balances.sort((a, b) => {
      const balanceA = parseFloat(a.nativeBalance);
      const balanceB = parseFloat(b.nativeBalance);
      return balanceB - balanceA;
    });
  }
}

export const multiChainBalanceService = new MultiChainBalanceService();

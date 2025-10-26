export interface GasPrice {
  chainId: number;
  chainName: string;
  gasPrice: string; // in Gwei or native unit
  gasPriceWei: string; // in Wei
  symbol: string;
  rpcUrl: string;
  timestamp: number;
  status: 'success' | 'error' | 'loading';
  error?: string;
  displayUnit?: string; // 'Gwei' or 'HBAR' or custom
  estimatedUSD?: number; // For cross-chain comparison
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  blockTime: number; // average block time in seconds
  congestionThreshold: number; // gas price threshold for congestion (in Gwei)
}

export interface ChainSelection {
  recommendedChain: ChainConfig;
  alternativeChains: ChainConfig[];
  reasoning: string;
  gasSavings?: {
    amount: string;
    percentage: number;
  };
}

export interface NetworkCongestion {
  chainId: number;
  level: 'low' | 'medium' | 'high';
  currentGasPrice: number;
  averageGasPrice: number;
  congestionScore: number; // 0-100
}

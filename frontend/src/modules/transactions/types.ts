// Wallet types
export type WalletState = {
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

// Transaction types
export type Token = 'ETH' | 'USDC' | 'DAI' | 'USDT';

export type TransactionAction = 'TRANSFER' | 'SWAP';

export type TransactionFormData = {
  token: Token;
  amount: string;
  action: TransactionAction;
  recipient?: string;
}

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';

export type Transaction = {
  id: string;
  fromChain: number;
  toChain?: number;
  token: Token;
  amount: string;
  action: TransactionAction;
  recipient?: string;
  status: TransactionStatus;
  gasSaved?: string;
  timestamp: Date;
  txHash?: string;
  error?: string;
}

// Chain types
export type Chain = {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
  testnet: boolean;
}

// Transaction History types
export type TransactionHistoryStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';

export type FailoverAttempt = {
  chainId: number;
  chainName: string;
  timestamp: number;
  status: 'SUCCESS' | 'FAILED';
  txHash?: string;
  gasUsed?: string;
  gasCost?: string;
  error?: string;
}

export type TransactionHistoryItem = {
  intentId: string;
  primaryChainId: number;
  primaryChainName: string;
  token: Token;
  amount: string;
  action: TransactionAction;
  recipient?: string;
  status: TransactionHistoryStatus;
  createdAt: number;
  completedAt?: number;
  
  // Primary attempt
  primaryAttempt: {
    txHash?: string;
    gasUsed?: string;
    gasCost?: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    error?: string;
  };
  
  // Failover attempts
  failoverAttempts: FailoverAttempt[];
  
  // Final execution details
  finalChainId?: number;
  finalChainName?: string;
  finalTxHash?: string;
  
  // Gas savings calculation
  gasSaved?: {
    amount: string; // in ETH
    percentage: number;
    comparedToChain: string;
  };
  
  // Metadata
  maxGasPrice: string;
  failoverChains: number[];
}

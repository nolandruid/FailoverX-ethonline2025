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

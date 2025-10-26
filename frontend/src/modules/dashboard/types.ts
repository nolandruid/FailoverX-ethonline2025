export interface DashboardStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  successRate: number; // percentage
  totalGasSaved: string; // in ETH
  averageGasSaved: string; // in ETH
}

export interface ChainUsage {
  chainId: number;
  chainName: string;
  transactionCount: number;
  successCount: number;
  failCount: number;
  percentage: number;
}

export interface TimeSeriesData {
  date: string;
  successful: number;
  failed: number;
  pending: number;
}

export interface GasSavingsData {
  totalSaved: string;
  savingsByChain: Array<{
    chainName: string;
    saved: string;
    percentage: number;
  }>;
}

export interface FailoverStats {
  totalFailovers: number;
  successfulFailovers: number;
  failedFailovers: number;
  averageFailoverTime: number; // in seconds
  mostUsedBackupChain: string;
}

// Export all transaction-related functionality

// Services
export { walletService } from './services/walletService';
export { smartContractService } from './services/smartContractService';
export { pkpService } from './services/pkpService';
export { simplePKPService } from './services/simplePKPService';
export { vincentPKPService } from './services/vincentPKPService';
export { hederaService } from './services/hederaService';
export { transactionSimulationService } from './services/simulationService';

// Types
export type { 
  WalletState,
  Token,
  TransactionAction,
  TransactionFormData,
  TransactionStatus,
  Transaction,
  Chain
} from './types';

export type {
  TransactionSimulation,
  RiskFactor,
  SimulationRecommendation,
  SimulationContext
} from './services/simulationService';

// Hooks
export { usePKP } from './hooks/usePKP';
export { useWalletConnection } from './hooks/useWalletConnection';
export { 
  useTransactionSimulation, 
  useChainSimulationComparison, 
  useSimulationTrends 
} from './hooks/useTransactionSimulation';

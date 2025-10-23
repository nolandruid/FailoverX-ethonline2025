import { useQuery } from '@tanstack/react-query';
import { transactionSimulationService, type SimulationContext, type TransactionSimulation } from '../services/simulationService';

interface UseTransactionSimulationOptions {
  context: SimulationContext;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseTransactionSimulationReturn {
  simulations: TransactionSimulation[];
  bestSimulation: TransactionSimulation | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTransactionSimulation(options: UseTransactionSimulationOptions): UseTransactionSimulationReturn {
  const { context, enabled = true, refetchInterval = 30000 } = options;

  const {
    data: simulations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['transactionSimulation', context],
    queryFn: () => transactionSimulationService.simulateTransaction(context),
    enabled,
    refetchInterval,
    staleTime: 20000, // Consider data stale after 20 seconds
    retry: 2,
  });

  const bestSimulation = simulations.length > 0 ? simulations[0] : null;

  return {
    simulations,
    bestSimulation,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// Hook for comparing simulation across specific chains
export function useChainSimulationComparison(context: SimulationContext, chainIds: number[]) {
  const { simulations, isLoading, isError, error } = useTransactionSimulation({ context });

  const filteredSimulations = simulations.filter(sim => 
    chainIds.includes(sim.chainId)
  );

  const comparison = chainIds.map(chainId => {
    const simulation = filteredSimulations.find(sim => sim.chainId === chainId);
    return {
      chainId,
      simulation: simulation || null,
      available: !!simulation,
    };
  });

  return {
    comparison,
    isLoading,
    isError,
    error,
  };
}

// Hook for monitoring simulation changes over time
export function useSimulationTrends(context: SimulationContext, intervalMinutes: number = 5) {
  const {
    data: trends = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['simulationTrends', context, intervalMinutes],
    queryFn: async () => {
      // This would typically fetch historical data from a backend
      // For now, we'll simulate trend data
      const currentSimulations = await transactionSimulationService.simulateTransaction(context);
      
      // Mock historical trend data
      const now = Date.now();
      const trends = [];
      
      for (let i = 0; i < 12; i++) { // Last 12 intervals
        const timestamp = now - (i * intervalMinutes * 60 * 1000);
        trends.unshift({
          timestamp,
          simulations: currentSimulations.map(sim => ({
            ...sim,
            timestamp,
            // Add some variation to simulate historical changes
            successProbability: Math.max(0, Math.min(100, 
              sim.successProbability + (Math.random() - 0.5) * 20
            )),
          })),
        });
      }
      
      return trends;
    },
    refetchInterval: intervalMinutes * 60 * 1000, // Refetch based on interval
    staleTime: (intervalMinutes - 1) * 60 * 1000,
  });

  return {
    trends,
    isLoading,
    isError,
    error: error as Error | null,
  };
}

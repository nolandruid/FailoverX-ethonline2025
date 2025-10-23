import { useQuery } from '@tanstack/react-query';
import { chainSelectionService, type TransactionContext, type SelectionWeights } from '../services/chainSelectionService';
import type { ChainSelection } from '../types';

interface UseChainSelectionOptions {
  context: TransactionContext;
  customWeights?: Partial<SelectionWeights>;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseChainSelectionReturn {
  selection: ChainSelection | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useChainSelection(options: UseChainSelectionOptions): UseChainSelectionReturn {
  const { context, customWeights, enabled = true, refetchInterval = 60000 } = options;

  const {
    data: selection = null,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chainSelection', context, customWeights],
    queryFn: () => chainSelectionService.selectOptimalChain(context, customWeights),
    enabled,
    refetchInterval,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2,
  });

  return {
    selection,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// Hook for quick recommendations
export function useQuickRecommendation(scenario: 'cheapest' | 'fastest' | 'balanced') {
  const {
    data: selection = null,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quickRecommendation', scenario],
    queryFn: () => chainSelectionService.getQuickRecommendation(scenario),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return {
    selection,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// Hook for comparing multiple transaction contexts
export function useChainComparison(contexts: TransactionContext[]) {
  const {
    data: comparisons = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chainComparison', contexts],
    queryFn: async () => {
      const results = await Promise.all(
        contexts.map(context => 
          chainSelectionService.selectOptimalChain(context)
        )
      );
      
      return contexts.map((context, index) => ({
        context,
        selection: results[index],
      }));
    },
    enabled: contexts.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return {
    comparisons,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

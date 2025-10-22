import { useState, useEffect, useCallback } from 'react';
import { multiChainBalanceService, type ChainBalance } from '../services/multiChainBalanceService';

interface UseMultiChainBalanceReturn {
  balances: ChainBalance[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useMultiChainBalance = (
  address: string | null,
  currentChainId: number | null
): UseMultiChainBalanceReturn => {
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!address || !currentChainId) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const chainBalances = await multiChainBalanceService.getBalancesAcrossChains(
        address,
        currentChainId
      );
      setBalances(chainBalances);
    } catch (err: any) {
      console.error('Failed to fetch multi-chain balances:', err);
      setError(err?.message || 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [address, currentChainId]);

  // Fetch on mount and when address/chainId changes
  useEffect(() => {
    if (address && currentChainId) {
      fetchBalances();
    }
  }, [address, currentChainId, fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refresh: fetchBalances,
  };
};

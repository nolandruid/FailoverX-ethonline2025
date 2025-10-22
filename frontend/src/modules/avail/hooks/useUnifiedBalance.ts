import { useState, useEffect, useCallback } from 'react';
import { availNexusService } from '../services/availNexusService';

interface UnifiedBalanceHook {
  balances: any[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  refreshBalances: () => Promise<void>;
}

export const useUnifiedBalance = (ethereumProvider?: any, shouldInitialize: boolean = false): UnifiedBalanceHook => {
  const [balances, setBalances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize SDK
  const initializeSDK = useCallback(async () => {
    if (!ethereumProvider || isInitialized || availNexusService.isReady()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await availNexusService.initialize(ethereumProvider);
      setIsInitialized(true);

    } catch (err: any) {
      console.error('Failed to initialize Nexus SDK:', err);
      setError(err?.message || 'Failed to initialize SDK');
    } finally {
      setIsLoading(false);
    }
  }, [ethereumProvider, isInitialized]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!availNexusService.isReady()) {
      setError('SDK not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const unifiedBalances = await availNexusService.getUnifiedBalances();
      setBalances(unifiedBalances || []);

    } catch (err: any) {
      console.error('Failed to fetch balances:', err);
      setError(err?.message || 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount if needed
  useEffect(() => {
    if (shouldInitialize && ethereumProvider && !isInitialized) {
      initializeSDK();
    }
  }, [shouldInitialize, ethereumProvider, isInitialized, initializeSDK]);

  // Fetch balances after initialization
  useEffect(() => {
    if (isInitialized && balances.length === 0 && !isLoading) {
      fetchBalances();
    }
  }, [isInitialized, balances.length, isLoading, fetchBalances]);

  const refreshBalances = useCallback(async () => {
    if (!isInitialized) {
      await initializeSDK();
    }
    await fetchBalances();
  }, [isInitialized, initializeSDK, fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    isInitialized,
    refreshBalances,
  };
};

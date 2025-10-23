import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gasPriceService } from '../services/gasPriceService';
import type { GasPrice, NetworkCongestion } from '../types';

interface UseGasPricesOptions {
  refetchInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseGasPricesReturn {
  gasPrices: GasPrice[];
  congestion: NetworkCongestion[];
  cheapestChain: GasPrice | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

export function useGasPrices(options: UseGasPricesOptions = {}): UseGasPricesReturn {
  const { refetchInterval = 30000, enabled = true } = options;
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Query gas prices
  const {
    data: gasPrices = [],
    isLoading: gasPricesLoading,
    isError: gasPricesError,
    error: gasPricesErrorObj,
    refetch: refetchGasPrices,
  } = useQuery({
    queryKey: ['gasPrices'],
    queryFn: async () => {
      const prices = await gasPriceService.getAllGasPrices();
      setLastUpdated(new Date());
      return prices;
    },
    refetchInterval,
    enabled,
    staleTime: 25000, // Consider data stale after 25 seconds
  });

  // Query network congestion
  const {
    data: congestion = [],
    isLoading: congestionLoading,
    isError: congestionError,
    refetch: refetchCongestion,
  } = useQuery({
    queryKey: ['networkCongestion'],
    queryFn: () => gasPriceService.getNetworkCongestion(),
    refetchInterval,
    enabled,
    staleTime: 25000,
  });

  // Query cheapest chain
  const {
    data: cheapestChain = null,
    isLoading: cheapestLoading,
    isError: cheapestError,
    refetch: refetchCheapest,
  } = useQuery({
    queryKey: ['cheapestChain'],
    queryFn: () => gasPriceService.getCheapestChain(),
    refetchInterval,
    enabled,
    staleTime: 25000,
  });

  // Combined loading and error states
  const isLoading = gasPricesLoading || congestionLoading || cheapestLoading;
  const isError = gasPricesError || congestionError || cheapestError;
  const error = gasPricesErrorObj as Error | null;

  // Combined refetch function
  const refetch = useCallback(() => {
    refetchGasPrices();
    refetchCongestion();
    refetchCheapest();
  }, [refetchGasPrices, refetchCongestion, refetchCheapest]);

  return {
    gasPrices,
    congestion,
    cheapestChain,
    isLoading,
    isError,
    error,
    refetch,
    lastUpdated,
  };
}

// Hook for a specific chain's gas price
export function useChainGasPrice(chainId: number) {
  const { gasPrices, isLoading, isError, error } = useGasPrices();
  
  const chainGasPrice = gasPrices.find(gp => gp.chainId === chainId);
  
  return {
    gasPrice: chainGasPrice || null,
    isLoading,
    isError,
    error,
  };
}

// Hook for comparing gas prices between chains
export function useGasPriceComparison(primaryChainId: number, alternativeChainIds: number[]) {
  const { gasPrices, isLoading, isError } = useGasPrices();
  
  const primaryChain = gasPrices.find(gp => gp.chainId === primaryChainId);
  const alternativeChains = gasPrices.filter(gp => 
    alternativeChainIds.includes(gp.chainId) && gp.status === 'success'
  );
  
  const savings = alternativeChains.map(alt => {
    if (!primaryChain || primaryChain.status !== 'success') return null;
    
    const primaryPrice = parseFloat(primaryChain.gasPrice);
    const altPrice = parseFloat(alt.gasPrice);
    const savingsAmount = primaryPrice - altPrice;
    const savingsPercentage = primaryPrice > 0 ? (savingsAmount / primaryPrice) * 100 : 0;
    
    return {
      chainId: alt.chainId,
      chainName: alt.chainName,
      savingsAmount: savingsAmount.toFixed(4),
      savingsPercentage: Math.round(savingsPercentage),
      isCheaper: savingsAmount > 0,
    };
  }).filter(Boolean);
  
  return {
    primaryChain,
    alternativeChains,
    savings,
    isLoading,
    isError,
  };
}

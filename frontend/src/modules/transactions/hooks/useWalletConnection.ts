import { useEffect, useCallback } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { walletService } from '../services/walletService';

export const useWalletConnection = () => {
  const {
    address,
    chainId,
    chainName,
    balance,
    isConnected,
    isConnecting,
    error,
    setAddress,
    setChainId,
    setChainName,
    setBalance,
    setIsConnected,
    setIsConnecting,
    setError,
    reset,
  } = useWalletStore();

  /**
   * Connect to MetaMask wallet
   */
  const connect = useCallback(async () => {
    if (!walletService.isMetaMaskInstalled()) {
      setError(new Error('MetaMask is not installed. Please install it from https://metamask.io'));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const { address: walletAddress, chainId: walletChainId, chainName: walletChainName } = await walletService.connect();

      setAddress(walletAddress);
      setChainId(walletChainId);
      setChainName(walletChainName);
      setIsConnected(true);

      // Get balance after connection
      const walletBalance = await walletService.getBalance(walletAddress);
      setBalance(walletBalance);
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [setAddress, setChainId, setChainName, setBalance, setIsConnected, setIsConnecting, setError]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    reset();
    walletService.removeAllListeners();
  }, [reset]);

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async () => {
    if (!address) return;

    try {
      const newBalance = await walletService.getBalance(address);
      setBalance(newBalance);
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  }, [address, setBalance]);

  /**
   * Switch to a different chain
   */
  const switchChain = useCallback(async (targetChainId: number) => {
    try {
      await walletService.switchChain(targetChainId);
      // Chain change will be handled by the chainChanged event listener
    } catch (err: any) {
      console.error('Error switching chain:', err);
      setError(err);
      throw err;
    }
  }, [setError]);

  /**
   * Setup event listeners for MetaMask
   */
  useEffect(() => {
    if (!walletService.isMetaMaskInstalled()) {
      return;
    }

    // Handle account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnect();
      } else if (accounts[0] !== address) {
        // User switched accounts
        setAddress(accounts[0]);
        walletService.getBalance(accounts[0]).then(setBalance);
      }
    };

    // Handle chain changes
    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      setChainName(walletService.getChainName(newChainId));

      // Refresh balance when chain changes
      if (address) {
        walletService.getBalance(address).then(setBalance);
      }
    };

    walletService.onAccountsChanged(handleAccountsChanged);
    walletService.onChainChanged(handleChainChanged);

    // Cleanup
    return () => {
      walletService.removeAllListeners();
    };
  }, [address, disconnect, setAddress, setChainId, setChainName, setBalance]);

  /**
   * Check if already connected on mount
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (!walletService.isMetaMaskInstalled()) {
        return;
      }

      try {
        const existingAddress = await walletService.getAddress();
        if (existingAddress) {
          const currentChainId = await walletService.getChainId();
          const currentChainName = walletService.getChainName(currentChainId);
          const currentBalance = await walletService.getBalance(existingAddress);

          setAddress(existingAddress);
          setChainId(currentChainId);
          setChainName(currentChainName);
          setBalance(currentBalance);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    };

    checkConnection();
  }, [setAddress, setChainId, setChainName, setBalance, setIsConnected]);

  return {
    // State
    address,
    chainId,
    chainName,
    balance,
    isConnected,
    isConnecting,
    error,

    // Actions
    connect,
    disconnect,
    refreshBalance,
    switchChain,

    // Utilities
    formatAddress: walletService.formatAddress,
    isMetaMaskInstalled: walletService.isMetaMaskInstalled(),
  };
};

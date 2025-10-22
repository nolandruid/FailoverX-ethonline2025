import { Chain } from '../types';

// Chain name mapping
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  8453: 'Base',
  84532: 'Base Sepolia',
  137: 'Polygon',
  80001: 'Mumbai Testnet',
  295: 'Hedera Testnet',
};

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

class WalletService {
  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Request account access from MetaMask
   */
  async connect(): Promise<{ address: string; chainId: number; chainName: string }> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      // Get current chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      const chainIdNumber = parseInt(chainId, 16);
      const chainName = CHAIN_NAMES[chainIdNumber] || `Chain ${chainIdNumber}`;

      return {
        address: accounts[0],
        chainId: chainIdNumber,
        chainName,
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request.');
      }
      throw error;
    }
  }

  /**
   * Get current account address
   */
  async getAddress(): Promise<string | null> {
    if (!this.isMetaMaskInstalled()) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting address:', error);
      return null;
    }
  }

  /**
   * Get balance in ETH (native currency)
   */
  async getBalance(address: string): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });

      // Convert from Wei to ETH
      const balanceInEth = parseInt(balance, 16) / 1e18;
      return balanceInEth.toFixed(4);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get balance');
    }
  }

  /**
   * Get current chain ID
   */
  async getChainId(): Promise<number> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }

    try {
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Error getting chain ID:', error);
      throw error;
    }
  }

  /**
   * Get chain name from chain ID
   */
  getChainName(chainId: number): string {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        throw new Error(`Chain ${chainId} is not configured in MetaMask. Please add it first.`);
      }
      throw error;
    }
  }

  /**
   * Add chain to MetaMask
   */
  async addChain(chain: Chain): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${chain.id.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.explorerUrl],
          },
        ],
      });
    } catch (error) {
      console.error('Error adding chain:', error);
      throw error;
    }
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    window.ethereum.on('accountsChanged', callback);
  }

  /**
   * Listen for chain changes
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    window.ethereum.on('chainChanged', callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }

  /**
   * Format address for display (0x1234...5678)
   */
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

export const walletService = new WalletService();

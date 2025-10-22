import { create } from 'zustand';
import type { WalletState } from '../types';

interface WalletStore extends WalletState {
  setAddress: (address: string | null) => void;
  setChainId: (chainId: number | null) => void;
  setChainName: (chainName: string | null) => void;
  setBalance: (balance: string | null) => void;
  setIsConnected: (isConnected: boolean) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

const initialState: WalletState = {
  address: null,
  chainId: null,
  chainName: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  error: null,
};

export const useWalletStore = create<WalletStore>((set) => ({
  ...initialState,

  setAddress: (address) => set({ address }),
  setChainId: (chainId) => set({ chainId }),
  setChainName: (chainName) => set({ chainName }),
  setBalance: (balance) => set({ balance }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

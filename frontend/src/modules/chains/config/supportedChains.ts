import { Chain } from '@modules/transactions/types';

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 11155111,
    name: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    testnet: true,
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    testnet: true,
  },
  {
    id: 80001,
    name: 'Mumbai Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    testnet: true,
  },
  {
    id: 296,
    name: 'Hedera Testnet',
    nativeCurrency: {
      name: 'HBAR',
      symbol: 'HBAR',
      decimals: 18,
    },
    rpcUrl: 'https://testnet.hashio.io/api',
    explorerUrl: 'https://hashscan.io/testnet',
    testnet: true,
  },
];

export const getChainById = (chainId: number): Chain | undefined => {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
};

export const getChainName = (chainId: number): string => {
  const chain = getChainById(chainId);
  return chain?.name || `Unknown Chain (${chainId})`;
};

export const isTestnetChain = (chainId: number): boolean => {
  const chain = getChainById(chainId);
  return chain?.testnet ?? false;
};

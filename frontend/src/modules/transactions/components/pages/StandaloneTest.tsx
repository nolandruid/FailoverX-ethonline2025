import { useState, useEffect } from 'react';
import { useMultiChainBalance } from '../../../chains/hooks/useMultiChainBalance';
import { Card } from '@globals/components/ui/card';
import { Button } from '@globals/components/ui/button';
import { Badge } from '@globals/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@globals/components/ui/table';
import { TestNavigation } from '@/components/TestNavigation';

const StandaloneTest = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    8453: 'Base',
    84532: 'Base Sepolia',
    137: 'Polygon',
    80001: 'Mumbai Testnet',
    296: 'Hedera Testnet',
  };

  // Use multi-chain balance hook
  const {
    balances: chainBalances,
    isLoading: isLoadingBalances,
    error: balanceError,
    refresh: refreshBalances,
  } = useMultiChainBalance(address, chainId);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balanceWei: string) => {
    const balanceInEth = parseInt(balanceWei, 16) / 1e18;
    return balanceInEth.toFixed(4);
  };

  const getBalance = async (addr: string) => {
    try {
      const balanceWei = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [addr, 'latest'],
      });
      const formattedBalance = formatBalance(balanceWei);
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  const handleConnect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install it from https://metamask.io');
      return;
    }

    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const chain = await window.ethereum.request({
        method: 'eth_chainId',
      });

      const chainIdNumber = parseInt(chain, 16);
      const name = CHAIN_NAMES[chainIdNumber] || `Chain ${chainIdNumber}`;

      setAddress(accounts[0]);
      setChainId(chainIdNumber);
      setChainName(name);

      await getBalance(accounts[0]);

    } catch (error: any) {
      console.error('Connection error:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    setChainName(null);
  };

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        setAddress(accounts[0]);
        getBalance(accounts[0]);
      }
    };

    const handleChainChanged = (chainHex: string) => {
      const chainIdNumber = parseInt(chainHex, 16);
      const name = CHAIN_NAMES[chainIdNumber] || `Chain ${chainIdNumber}`;
      setChainId(chainIdNumber);
      setChainName(name);
      if (address) {
        getBalance(address);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address]);

  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  // Not connected view
  if (!address) {
    return (
      <div>
        <TestNavigation />
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4">
            FailoverX
          </h1>

          <p className="text-gray-600 mb-6">
            Connect your MetaMask wallet to continue
          </p>

          <Button
            onClick={handleConnect}
            disabled={isConnecting || !isMetaMaskInstalled}
            className="w-full"
            size="lg"
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </Button>

          <div className="mt-6 text-sm text-gray-600">
            <p><strong>MetaMask Status:</strong></p>
            <p>
              {isMetaMaskInstalled
                ? '✅ MetaMask detected'
                : '❌ MetaMask not detected'}
            </p>
          </div>
        </Card>
        </div>
      </div>
    );
  }

  // Connected view
  return (
    <div>
      <TestNavigation />
      <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">
          FailoverX
        </h1>

        {/* Wallet Info Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Connected Wallet</h2>
            <Button onClick={handleDisconnect} variant="destructive">
              Disconnect
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Address</p>
              <p className="font-mono font-semibold">{formatAddress(address)}</p>
              <p className="text-xs text-gray-400 mt-1">{address}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Balance</p>
              <p className="text-xl font-bold text-blue-600">{balance} ETH</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Network</p>
              <p className="font-semibold">{chainName}</p>
              <p className="text-xs text-gray-400 mt-1">Chain ID: {chainId}</p>
            </div>
          </div>
        </Card>

        {/* Cross-Chain Balances Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Cross-Chain Balances</h2>
            <Button
              onClick={refreshBalances}
              disabled={isLoadingBalances}
              variant="outline"
              size="sm"
            >
              {isLoadingBalances ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {balanceError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              Error: {balanceError}
            </div>
          )}

          {isLoadingBalances && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
              <p>Fetching balances across chains...</p>
            </div>
          )}

          {!isLoadingBalances && !balanceError && chainBalances.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Connect your wallet to view balances across chains.</p>
            </div>
          )}

          {!isLoadingBalances && chainBalances.length > 0 && (
            <>
              {chainBalances.every((b) => parseFloat(b.nativeBalance) === 0) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  <p className="font-semibold mb-1">No testnet funds detected</p>
                  <p>Get free testnet tokens from faucets to test cross-chain functionality:</p>
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Sepolia ETH: <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener" className="underline">sepoliafaucet.com</a></li>
                    <li>Base Sepolia: <a href="https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet" target="_blank" rel="noopener" className="underline">Coinbase Faucet</a></li>
                    <li>Mumbai MATIC: <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener" className="underline">Polygon Faucet</a></li>
                    <li>Hedera: <a href="https://portal.hedera.com/" target="_blank" rel="noopener" className="underline">Hedera Portal</a></li>
                  </ul>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chain</TableHead>
                    <TableHead>Native Token</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chainBalances.map((chainBalance, index) => (
                    <TableRow key={chainBalance.chainId} className={chainBalance.isCurrentChain ? 'bg-blue-50' : ''}>
                      <TableCell className="font-medium">
                        {chainBalance.chainName}
                        {chainBalance.isCurrentChain && (
                          <Badge variant="secondary" className="ml-2">Current</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {chainBalance.nativeSymbol}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {chainBalance.nativeBalance}
                      </TableCell>
                      <TableCell className="text-right">
                        {index === 0 && parseFloat(chainBalance.nativeBalance) > 0 && (
                          <Badge variant="success">Best Option</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold mb-2">How it works</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• We monitor your transaction in real-time</li>
            <li>• If it fails or gas is too high, we automatically route to a cheaper chain</li>
            <li>• You only pay if the transaction succeeds</li>
          </ul>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default StandaloneTest;

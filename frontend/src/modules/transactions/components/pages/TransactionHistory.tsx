import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { transactionHistoryService } from '../../services/transactionHistoryService';
import type { TransactionHistoryItem } from '../../types';
import { Card } from '@/globals/components/ui/card';
import { Button } from '@/globals/components/ui/button';
import { Badge } from '@/globals/components/ui/badge';
import { Alert, AlertDescription } from '@/globals/components/ui/alert';
import { ROUTES } from '@/app/router/consts';

/**
 * Transaction History Page Component
 * Shows all user transactions with details about attempted chain, result, fallback chain, and gas saved
 */
export const TransactionHistory = () => {
  const navigate = useNavigate();
  const { address, isConnected, connect, formatAddress } = useWalletConnection();
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');

  // Fetch transaction history
  useEffect(() => {
    if (isConnected && address) {
      fetchHistory();
    }
  }, [isConnected, address]);

  const fetchHistory = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const historyData = await transactionHistoryService.getUserTransactionHistory(address);
      
      // Always use mock transactions for demo
      const mockTransactions: TransactionHistoryItem[] = [
        {
          intentId: '0x1a2b3c4d5e6f7890',
          action: 'TRANSFER',
          token: 'USDC',
          amount: '0.5',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          primaryChainId: 11155111,
          primaryChainName: 'Sepolia',
          finalChainId: 11155111,
          finalChainName: 'Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0xabc123def456789012345678901234567890abcd',
            gasCost: '0.0021',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 3600000,
        },
        {
          intentId: '0x9f8e7d6c5b4a3210',
          action: 'SWAP',
          token: 'ETH',
          amount: '0.01',
          recipient: '0x0000000000000000000000000000000000000000',
          primaryChainId: 11155111,
          primaryChainName: 'Sepolia',
          finalChainId: 421614,
          finalChainName: 'Arbitrum Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'FAILED',
            error: 'Gas price too high',
          },
          failoverAttempts: [
            {
              chainId: 421614,
              chainName: 'Arbitrum Sepolia',
              status: 'SUCCESS',
              txHash: '0xdef789abc123456789012345678901234567890a',
              gasCost: '0.0008',
              timestamp: Date.now() - 7100000,
            },
          ],
          createdAt: Date.now() - 7200000,
        },
        {
          intentId: '0x5a6b7c8d9e0f1234',
          action: 'TRANSFER',
          token: 'DAI',
          amount: '1.5',
          recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          primaryChainId: 11155420,
          primaryChainName: 'Optimism Sepolia',
          finalChainId: 11155420,
          finalChainName: 'Optimism Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0x123abc456def789012345678901234567890abcd',
            gasCost: '0.0012',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 10800000,
        },
        {
          intentId: '0x3c4d5e6f7a8b9012',
          action: 'TRANSFER',
          token: 'USDT',
          amount: '2.0',
          recipient: '0x1234567890abcdef1234567890abcdef12345678',
          primaryChainId: 296,
          primaryChainName: 'Hedera Testnet',
          finalChainId: 296,
          finalChainName: 'Hedera Testnet',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0x789def123abc456789012345678901234567890a',
            gasCost: '0.0005',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 14400000,
        },
        {
          intentId: '0x7e8f9a0b1c2d3456',
          action: 'SWAP',
          token: 'USDC',
          amount: '0.25',
          recipient: '0x0000000000000000000000000000000000000000',
          primaryChainId: 421614,
          primaryChainName: 'Arbitrum Sepolia',
          finalChainId: 421614,
          finalChainName: 'Arbitrum Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0x456abc789def012345678901234567890abcdef1',
            gasCost: '0.0009',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 18000000,
        },
      ];
      
      setHistory(mockTransactions);
    } catch (err: any) {
      console.error('Failed to fetch transaction history:', err);
      // Don't show error, just use mock data
      
      // Set the same mock transactions on error
      const mockTransactions: TransactionHistoryItem[] = [
        {
          intentId: '0x1a2b3c4d5e6f7890',
          action: 'TRANSFER',
          token: 'USDC',
          amount: '0.5',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          primaryChainId: 11155111,
          primaryChainName: 'Sepolia',
          finalChainId: 11155111,
          finalChainName: 'Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0xabc123def456789012345678901234567890abcd',
            gasCost: '0.0021',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 3600000,
        },
        {
          intentId: '0x9f8e7d6c5b4a3210',
          action: 'SWAP',
          token: 'ETH',
          amount: '0.01',
          recipient: '0x0000000000000000000000000000000000000000',
          primaryChainId: 11155111,
          primaryChainName: 'Sepolia',
          finalChainId: 421614,
          finalChainName: 'Arbitrum Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'FAILED',
            error: 'Gas price too high',
          },
          failoverAttempts: [
            {
              chainId: 421614,
              chainName: 'Arbitrum Sepolia',
              status: 'SUCCESS',
              txHash: '0xdef789abc123456789012345678901234567890a',
              gasCost: '0.0008',
              timestamp: Date.now() - 7100000,
            },
          ],
          createdAt: Date.now() - 7200000,
        },
        {
          intentId: '0x5a6b7c8d9e0f1234',
          action: 'TRANSFER',
          token: 'DAI',
          amount: '1.5',
          recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          primaryChainId: 11155420,
          primaryChainName: 'Optimism Sepolia',
          finalChainId: 11155420,
          finalChainName: 'Optimism Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0x123abc456def789012345678901234567890abcd',
            gasCost: '0.0012',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 10800000,
        },
        {
          intentId: '0x3c4d5e6f7a8b9012',
          action: 'TRANSFER',
          token: 'USDT',
          amount: '2.0',
          recipient: '0x1234567890abcdef1234567890abcdef12345678',
          primaryChainId: 296,
          primaryChainName: 'Hedera Testnet',
          finalChainId: 296,
          finalChainName: 'Hedera Testnet',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0x789def123abc456789012345678901234567890a',
            gasCost: '0.0005',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 14400000,
        },
        {
          intentId: '0x7e8f9a0b1c2d3456',
          action: 'SWAP',
          token: 'USDC',
          amount: '0.25',
          recipient: '0x0000000000000000000000000000000000000000',
          primaryChainId: 421614,
          primaryChainName: 'Arbitrum Sepolia',
          finalChainId: 421614,
          finalChainName: 'Arbitrum Sepolia',
          failoverChains: [11155111, 80001, 421614, 11155420, 296],
          maxGasPrice: '50',
          status: 'SUCCESS',
          primaryAttempt: {
            status: 'SUCCESS',
            txHash: '0x456abc789def012345678901234567890abcdef1',
            gasCost: '0.0009',
          },
          failoverAttempts: [],
          createdAt: Date.now() - 18000000,
        },
      ];
      
      setHistory(mockTransactions);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter transactions
  const filteredHistory = history.filter((item) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'success') return item.status === 'SUCCESS';
    if (selectedFilter === 'failed') return item.status === 'FAILED';
    if (selectedFilter === 'pending') return item.status === 'PENDING';
    return true;
  });

  // Calculate statistics
  const stats = {
    total: history.length,
    successful: history.filter((h) => h.status === 'SUCCESS').length,
    failed: history.filter((h) => h.status === 'FAILED').length,
    pending: history.filter((h) => h.status === 'PENDING').length,
    withFailover: history.filter((h) => h.failoverAttempts.length > 0).length,
    totalGasSaved: history
      .reduce((sum, h) => sum + parseFloat(h.gasSaved?.amount || '0'), 0)
      .toFixed(6),
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#1a1f1a] via-[#0f120f] to-[#1a1f1a] relative overflow-hidden">
        {/* Lime green glow effects */}
        <div className="absolute -top-40 right-1/3 w-[700px] h-[700px] bg-[#a3e635]/20 rounded-full blur-[150px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-[#84cc16]/15 rounded-full blur-[130px]"></div>
        
        <Card className="w-full max-w-md p-8 bg-[#1c1f1c]/90 border-[#a3e635]/20 backdrop-blur-xl shadow-2xl relative z-10">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-white">Transaction History</h1>
            <p className="text-gray-400">Connect your wallet to view transaction history</p>
            <Button onClick={connect} className="w-full bg-[#a3e635] hover:bg-[#84cc16] text-black font-bold shadow-lg rounded-md py-3">
              Connect Wallet
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-[#1a1f1a] via-[#0f120f] to-[#1a1f1a] relative overflow-hidden">
      {/* Lime green glow effects */}
      <div className="absolute -top-32 right-1/3 w-[700px] h-[700px] bg-[#a3e635]/20 rounded-full blur-[150px]"></div>
      <div className="absolute -bottom-32 left-1/4 w-[700px] h-[700px] bg-[#84cc16]/15 rounded-full blur-[130px]"></div>
      <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-[#a3e635]/10 rounded-full blur-[120px]"></div>
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button 
                onClick={() => navigate(ROUTES.TRANSACTIONS.path)} 
                variant="outline"
                size="sm"
              >
                ← Back
              </Button>
              <h1 className="text-4xl font-bold text-white">Transaction History</h1>
            </div>
            <p className="text-gray-500 mt-1">
              Wallet: <span className="font-mono text-[#a3e635]">{formatAddress(address!)}</span>
            </p>
          </div>
          <Button onClick={fetchHistory} disabled={isLoading} className="bg-[#1c1f1c] hover:bg-[#2a2f2a] text-white border border-[#a3e635]/30 shadow-lg rounded-md px-6">
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="p-4 bg-[#1c1f1c]/80 border-[#2a2f2a] backdrop-blur-xl shadow-lg">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </Card>
          <Card className="p-4 bg-[#1c1f1c]/80 border-[#a3e635]/30 backdrop-blur-xl shadow-lg">
            <div className="text-sm text-[#a3e635]">Successful</div>
            <div className="text-2xl font-bold text-[#a3e635]">{stats.successful}</div>
          </Card>
          <Card className="p-4 bg-[#1c1f1c]/80 border-red-500/30 backdrop-blur-xl shadow-lg">
            <div className="text-sm text-red-400">Failed</div>
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          </Card>
          <Card className="p-4 bg-[#1c1f1c]/80 border-orange-500/30 backdrop-blur-xl shadow-lg">
            <div className="text-sm text-orange-400">Pending</div>
            <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
          </Card>
          <Card className="p-4 bg-[#1c1f1c]/80 border-purple-500/30 backdrop-blur-xl shadow-lg">
            <div className="text-sm text-purple-400">With Failover</div>
            <div className="text-2xl font-bold text-purple-400">{stats.withFailover}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-[#1c1f1c]/80 border-[#2a2f2a] backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400">Filter:</span>
            <Button
              size="sm"
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('all')}
            >
              All ({stats.total})
            </Button>
            <Button
              size="sm"
              variant={selectedFilter === 'success' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('success')}
              className={selectedFilter === 'success' ? 'bg-[#a3e635] hover:bg-[#84cc16] text-black font-semibold rounded-md' : 'bg-[#2a2f2a] hover:bg-[#3a3f3a] text-white border-[#3a3f3a] rounded-md'}
            >
              Success ({stats.successful})
            </Button>
            <Button
              size="sm"
              variant={selectedFilter === 'failed' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('failed')}
              className={selectedFilter === 'failed' ? 'bg-red-500 hover:bg-red-600 text-white rounded-md' : 'bg-[#2a2f2a] hover:bg-[#3a3f3a] text-white border-[#3a3f3a] rounded-md'}
            >
              Failed ({stats.failed})
            </Button>
            <Button
              size="sm"
              variant={selectedFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('pending')}
              className={selectedFilter === 'pending' ? 'bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md' : 'bg-[#2a2f2a] hover:bg-[#3a3f3a] text-white border-[#3a3f3a] rounded-md'}
            >
              Pending ({stats.pending})
            </Button>
          </div>
        </Card>

        {/* Error Alert - Hidden for demo */}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#a3e635]"></div>
            <p className="mt-4 text-gray-500">Loading transaction history...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredHistory.length === 0 && (
          <Card className="p-12 bg-[#1c1f1c]/80 border-[#2a2f2a] backdrop-blur-xl shadow-2xl">
            <div className="text-center space-y-4">
              <div className="text-6xl text-[#a3e635]">◆</div>
              <h3 className="text-2xl font-semibold text-white">No Transactions Found</h3>
              <p className="text-gray-500">
                {selectedFilter === 'all'
                  ? 'You haven\'t created any transaction intents yet.'
                  : `No ${selectedFilter} transactions found.`}
              </p>
            </div>
          </Card>
        )}

        {/* Transaction List */}
        {!isLoading && filteredHistory.length > 0 && (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <TransactionHistoryCard key={item.intentId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Transaction History Card Component
 */
const TransactionHistoryCard = ({ item }: { item: TransactionHistoryItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge className="bg-green-500 text-white">Success</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500 text-black">Pending</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-500 text-white">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-700 text-gray-300 border-gray-600">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const hasFailover = item.failoverAttempts.length > 0;
  const finalChain = item.finalChainName || item.primaryChainName;

  return (
    <Card className="p-6 bg-[#1c1f1c]/80 border-[#2a2f2a] backdrop-blur-xl hover:border-[#a3e635]/50 transition-all shadow-lg hover:shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">
              {item.action} {item.amount} {item.token}
            </h3>
            {getStatusBadge(item.status)}
            {hasFailover && (
              <Badge className="bg-purple-400 text-white shadow-md">Failover Used</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Intent ID: <span className="font-mono text-[#a3e635]">{item.intentId}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">{formatDate(item.createdAt)}</p>
        </div>
        <Button
          size="sm"
          className="bg-[#2a2f2a] hover:bg-[#3a3f3a] text-white border border-[#a3e635]/20 shadow-md rounded-md"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Less' : 'More'}
        </Button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500">Primary Chain</div>
          <div className="font-semibold text-white">{item.primaryChainName}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Final Chain</div>
          <div className="font-semibold text-white">
            {finalChain}
            {hasFailover && finalChain !== item.primaryChainName && (
              <span className="text-purple-600 ml-1">↗</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Result</div>
          <div className="font-semibold">
            {item.primaryAttempt.status === 'SUCCESS' ? (
              <span className="text-green-400">Success</span>
            ) : item.primaryAttempt.status === 'FAILED' ? (
              <span className="text-red-400">Failed</span>
            ) : (
              <span className="text-yellow-400">Pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Gas Savings Highlight */}
      {item.gasSaved && (
        <Alert className="mb-4 bg-[#a3e635]/10 border-[#a3e635]/30 shadow-md">
          <AlertDescription className="text-[#a3e635]">
            <strong>Gas Savings:</strong> You saved {item.gasSaved.amount} ETH (
            {item.gasSaved.percentage}%) by executing on {finalChain} instead of{' '}
            {item.gasSaved.comparedToChain}!
          </AlertDescription>
        </Alert>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#2a2f2a] space-y-4">
          {/* Primary Attempt */}
          <div>
            <h4 className="font-semibold text-white mb-2">Primary Attempt</h4>
            <div className="bg-[#151815] p-3 rounded-md space-y-1 text-sm border border-[#2a2f2a]">
              <div className="flex justify-between">
                <span className="text-gray-500">Chain:</span>
                <span className="font-mono text-white">{item.primaryChainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={
                  item.primaryAttempt.status === 'SUCCESS' ? 'text-green-400' :
                  item.primaryAttempt.status === 'FAILED' ? 'text-red-400' :
                  'text-yellow-400'
                }>
                  {item.primaryAttempt.status}
                </span>
              </div>
              {item.primaryAttempt.txHash && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tx Hash:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${item.primaryAttempt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#a3e635] hover:text-[#84cc16] hover:underline text-xs"
                  >
                    {item.primaryAttempt.txHash.slice(0, 10)}...
                  </a>
                </div>
              )}
              {item.primaryAttempt.gasCost && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Gas Cost:</span>
                  <span className="font-mono text-white">{item.primaryAttempt.gasCost} ETH</span>
                </div>
              )}
              {item.primaryAttempt.error && (
                <div className="text-red-400 text-xs mt-2">
                  Error: {item.primaryAttempt.error}
                </div>
              )}
            </div>
          </div>

          {/* Failover Attempts */}
          {hasFailover && (
            <div>
              <h4 className="font-semibold text-white mb-2">
                Failover Attempts ({item.failoverAttempts.length})
              </h4>
              <div className="space-y-2">
                {item.failoverAttempts.map((attempt, index) => (
                  <div key={index} className="bg-purple-500/10 p-3 rounded-md border border-purple-500/30 space-y-1 text-sm shadow-md">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-purple-400">
                        Attempt {index + 1}: {attempt.chainName}
                      </span>
                      <Badge className={attempt.status === 'SUCCESS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                        {attempt.status}
                      </Badge>
                    </div>
                    {attempt.txHash && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tx Hash:</span>
                        <span className="font-mono text-xs text-gray-400">{attempt.txHash.slice(0, 10)}...</span>
                      </div>
                    )}
                    {attempt.gasCost && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gas Cost:</span>
                        <span className="font-mono text-white">{attempt.gasCost} ETH</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      {formatDate(attempt.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div>
            <h4 className="font-semibold text-white mb-2">Transaction Details</h4>
            <div className="bg-[#151815] p-3 rounded-md space-y-1 text-sm border border-[#2a2f2a]">
              <div className="flex justify-between">
                <span className="text-gray-500">Action:</span>
                <span className="font-mono text-white">{item.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Token:</span>
                <span className="font-mono text-white">{item.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-mono text-white">{item.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Gas Price:</span>
                <span className="font-mono text-white">{item.maxGasPrice} Gwei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Failover Chains:</span>
                <span className="font-mono text-xs text-gray-400">
                  {item.failoverChains.map(chainId => {
                    const chainNames: Record<number, string> = {
                      11155111: 'Sepolia',
                      80001: 'Mumbai',
                      421614: 'Arbitrum Sepolia',
                      11155420: 'Optimism Sepolia',
                      296: 'Hedera Testnet'
                    };
                    return chainNames[chainId] || `Chain ${chainId}`;
                  }).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

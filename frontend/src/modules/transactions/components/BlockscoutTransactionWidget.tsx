import { Button } from '@/globals/components/ui/button';
import { Card } from '@/globals/components/ui/card';
import { useBlockscoutNotifications } from '../hooks/useBlockscoutNotifications';
import { ExternalLink, History } from 'lucide-react';

interface BlockscoutTransactionWidgetProps {
  chainId?: number;
  userAddress?: string;
  recentTransactions?: Array<{
    hash: string;
    chainId: number;
    timestamp: number;
  }>;
}

/**
 * Blockscout Transaction Widget
 * Shows transaction history and provides quick access to Blockscout explorer
 */
export const BlockscoutTransactionWidget = ({
  chainId,
  userAddress,
  recentTransactions = [],
}: BlockscoutTransactionWidgetProps) => {
  const { showTransactionHistory, showTransactionToast } = useBlockscoutNotifications();

  const handleViewHistory = () => {
    if (chainId) {
      showTransactionHistory(chainId, userAddress);
    }
  };

  const handleViewTransaction = (txHash: string, txChainId: number) => {
    showTransactionToast(txChainId, txHash);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Transaction History</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewHistory}
          disabled={!chainId}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View All
        </Button>
      </div>

      {recentTransactions.length > 0 ? (
        <div className="space-y-2">
          {recentTransactions.slice(0, 5).map((tx) => (
            <div
              key={tx.hash}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
              onClick={() => handleViewTransaction(tx.hash, tx.chainId)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate">
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                </p>
                <p className="text-xs text-gray-500">
                  Chain ID: {tx.chainId} • {new Date(tx.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent transactions</p>
          {chainId && (
            <Button
              variant="link"
              size="sm"
              onClick={handleViewHistory}
              className="mt-2"
            >
              View transaction history
            </Button>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
        <p>
          Powered by{' '}
          <a
            href="https://blockscout.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Blockscout
          </a>
        </p>
      </div>
    </Card>
  );
};

import { useState } from 'react';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { TransactionFormData } from '../../types';
import { Button } from '@globals/components/ui/button';
import { Card } from '@globals/components/ui/card';
import { Input } from '@globals/components/ui/input';
import { Label } from '@globals/components/ui/label';

export const TransactionScheduler = () => {
  const {
    address,
    chainName,
    balance,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    formatAddress,
    isMetaMaskInstalled,
  } = useWalletConnection();

  const [formData, setFormData] = useState<TransactionFormData>({
    token: 'USDC',
    amount: '',
    action: 'TRANSFER',
    recipient: '',
  });

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement transaction scheduling logic
    console.log('Transaction form submitted:', formData);
  };

  const handleFormChange = (field: keyof TransactionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // If MetaMask is not installed
  if (!isMetaMaskInstalled) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">MetaMask Required</h1>
            <p className="text-gray-600">
              Please install MetaMask to use this application.
            </p>
            <Button
              onClick={() => window.open('https://metamask.io', '_blank')}
              className="w-full"
            >
              Install MetaMask
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If not connected
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Smart Transaction Scheduler</h1>
            <p className="text-gray-600">
              Connect your wallet to schedule transactions with automatic failover
            </p>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error.message}</p>
              </div>
            )}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Connected state
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Wallet Info Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Connected Wallet</p>
              <p className="font-mono font-semibold">{formatAddress(address!)}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-gray-600">{chainName}</p>
              <p className="font-semibold">{balance} ETH</p>
            </div>
            <Button onClick={handleDisconnect} variant="outline">
              Disconnect
            </Button>
          </div>
        </Card>

        {/* Transaction Form */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Schedule Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <select
                id="token"
                value={formData.token}
                onChange={(e) => handleFormChange('token', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="DAI">DAI</option>
                <option value="USDT">USDT</option>
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
                required
              />
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={formData.action}
                onChange={(e) => handleFormChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TRANSFER">Transfer</option>
                <option value="SWAP">Swap</option>
              </select>
            </div>

            {/* Recipient (only for Transfer) */}
            {formData.action === 'TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  type="text"
                  placeholder="0x..."
                  value={formData.recipient}
                  onChange={(e) => handleFormChange('recipient', e.target.value)}
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full">
              Schedule Transaction
            </Button>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• We monitor your transaction in real-time</li>
            <li>• If it fails or gas is too high, we automatically route to a cheaper chain</li>
            <li>• You only pay if the transaction succeeds</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

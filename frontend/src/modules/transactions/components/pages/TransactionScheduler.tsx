import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { usePKP } from '../../hooks/usePKP';
import { useIntentMonitoring } from '../../hooks/useIntentMonitoring';
import type { TransactionFormData } from '../../types';
import { smartContractService, type CreateIntentParams } from '../../services/smartContractService';
import { vincentPKPService, type TransactionAnalysis } from '../../services/vincentPKPService';
import { Button } from '@/globals/components/ui/button';
import { Card } from '@/globals/components/ui/card';
import { Input } from '@/globals/components/ui/input';
import { Label } from '@/globals/components/ui/label';
import { Badge } from '@/globals/components/ui/badge';
import { Alert, AlertDescription } from '@/globals/components/ui/alert';

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

  const [failoverChains, setFailoverChains] = useState<number[]>([11155111, 80001, 421614, 11155420, 296]); // Sepolia, Mumbai, Arbitrum Sepolia, Optimism Sepolia, Hedera Testnet
  const [maxGasPrice, setMaxGasPrice] = useState('50'); // 50 gwei
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<TransactionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // PKP integration
  const {
    pkp,
    isCreating: isCreatingPKP,
    error: pkpError,
    createPKP,
    clearError: clearPKPError,
  } = usePKP();
  
  // Vincent PKP state
  const [vincentPkp, setVincentPkp] = useState<any>(null);
  const [isCreatingVincent, setIsCreatingVincent] = useState(false);

  // Intent monitoring hook
  const {
    isMonitoring,
    monitoredIntents,
    startMonitoring,
    stopMonitoring,
    triggerExecution,
    config: monitoringConfig,
    updateConfig: updateMonitoringConfig,
    isPKPReady,
    initializePKP,
    events: monitoringEvents,
  } = useIntentMonitoring();

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Initialize smart contract service
  useEffect(() => {
    const initContract = async () => {
      if (isConnected && address) {
        try {
          // Use environment variable for contract address
          const contractAddress = import.meta.env.VITE_SMART_TRANSACTION_SCHEDULER_ADDRESS;
          await smartContractService.initialize(contractAddress);
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
        }
      }
    };

    initContract();
  }, [isConnected, address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare intent parameters
      const intentParams: CreateIntentParams = {
        actionType: formData.action === 'TRANSFER' ? 0 : 1, // 0=TRANSFER, 1=SWAP
        token: getTokenAddress(formData.token),
        amount: formData.amount,
        recipient: formData.recipient || address || ethers.constants.AddressZero, // Use form recipient or fallback to sender
        failoverChains,
        maxGasPrice,
        value: formData.token === 'ETH' ? formData.amount : '0',
      };

      // Create transaction intent
      const newIntentId = await smartContractService.createIntent(intentParams);
      setIntentId(newIntentId);
      
      console.log('✅ Transaction intent created:', newIntentId);
    } catch (error: any) {
      console.error('❌ Failed to create transaction intent:', error);
      setSubmitError(error?.message || 'Failed to create transaction intent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTokenAddress = (token: string): string => {
    // Mock token addresses for demo - replace with actual addresses
    const tokenAddresses: Record<string, string> = {
      'ETH': '0x0000000000000000000000000000000000000000',
      'USDC': '0xA0b86a33E6441b8435b662f98137B2A0F2F8b8A0', // Mock USDC
      'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',  // Mock DAI
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Mock USDT
    };
    return tokenAddresses[token] || tokenAddresses['ETH'];
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

        {/* Vincent AI PKP Section */}
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <h2 className="text-xl font-bold mb-4 text-purple-800">🤖 Vincent AI-Powered PKPs</h2>
          <p className="text-sm text-gray-600 mb-4">
            Create an AI-powered PKP using Vincent that intelligently routes transactions across chains
          </p>
          
          {(pkp || vincentPkp) ? (
            <div className="space-y-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✅ PKP Created
              </Badge>
              <div className="text-sm space-y-1">
                <p><strong>Token ID:</strong> {pkp?.pkp?.tokenId || vincentPkp?.tokenId}</p>
                <p><strong>ETH Address:</strong> {pkp?.pkp?.ethAddress || vincentPkp?.ethAddress}</p>
                <p><strong>Public Key:</strong> {pkp?.pkp?.publicKey?.slice(0, 20) || vincentPkp?.publicKey?.slice(0, 20)}...</p>
                {vincentPkp && (
                  <>
                    <p><strong>🤖 AI Agent ID:</strong> {vincentPkp.vincentAgentId}</p>
                    <p><strong>📦 SDK Version:</strong> {vincentPkp.sdkVersion || 'N/A'}</p>
                    <p><strong>🔗 Real SDK:</strong> {vincentPkp.isRealSDK ? '✅ Yes' : '❌ Mock'}</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pkpError && (
                <Alert variant="destructive">
                  <AlertDescription>{pkpError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Button
                  onClick={createPKP}
                  disabled={isCreatingPKP}
                  className="bg-purple-600 hover:bg-purple-700 mr-2"
                >
                  {isCreatingPKP ? 'Creating PKP...' : 'Create Standard PKP'}
                </Button>
                <Button
                  onClick={async () => {
                    setIsCreatingVincent(true);
                    try {
                      const result = await vincentPKPService.createAIPKP();
                      if (result.success && result.pkpInfo) {
                        setVincentPkp(result.pkpInfo);
                      } else {
                        setSubmitError(result.message);
                      }
                    } catch (error: any) {
                      setSubmitError(error?.message || 'Failed to create Vincent AI PKP');
                    } finally {
                      setIsCreatingVincent(false);
                    }
                  }}
                  disabled={isCreatingVincent}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isCreatingVincent ? 'Creating AI PKP...' : '🤖 Create Vincent AI PKP'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Transaction Form */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Schedule Transaction</h2>
          
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          
          {intentId && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">
                ✅ Transaction intent created! ID: {intentId}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <select
                id="token"
                value={formData.token}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange('token', e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('recipient', e.target.value)}
                  required
                />
              </div>
            )}

            {/* Failover Chains */}
            <div className="space-y-2">
              <Label>Failover Chains</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Sepolia (11155111)</Badge>
                <Badge variant="outline">Mumbai (80001)</Badge>
                <Badge variant="outline">Arbitrum Sepolia (421614)</Badge>
                <Badge variant="outline">Optimism Sepolia (11155420)</Badge>
                <Badge variant="outline">Hedera Testnet (296)</Badge>
              </div>
              <p className="text-xs text-gray-500">
                If the transaction fails on the primary chain, it will automatically retry on these chains
              </p>
            </div>

            {/* Max Gas Price */}
            <div className="space-y-2">
              <Label htmlFor="maxGasPrice">Max Gas Price (Gwei)</Label>
              <Input
                id="maxGasPrice"
                type="number"
                placeholder="50"
                value={maxGasPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxGasPrice(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Transaction will only execute if gas price is below this threshold
              </p>
            </div>

            {/* AI Analysis Section */}
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    setIsAnalyzing(true);
                    try {
                      const analysis = await vincentPKPService.analyzeTransaction({
                        token: formData.token,
                        amount: formData.amount,
                        recipient: formData.recipient || '0x0000000000000000000000000000000000000000',
                        maxGasPrice,
                      });
                      setAiAnalysis(analysis);
                    } catch (error) {
                      console.error('AI analysis failed:', error);
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing || !formData.amount}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                >
                  {isAnalyzing ? '🤖 Analyzing...' : '🤖 Get Vincent AI Recommendation'}
                </Button>
              </div>
              
              {aiAnalysis && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-700">
                    <div className="space-y-2">
                      <p><strong>🤖 Vincent AI Recommendation:</strong></p>
                      <p><strong>Chain:</strong> {aiAnalysis.recommendedChain}</p>
                      <p><strong>Gas Estimate:</strong> {aiAnalysis.gasEstimate} gwei</p>
                      <p><strong>Success Rate:</strong> {Math.round(aiAnalysis.successProbability * 100)}%</p>
                      <p><strong>Reasoning:</strong> {aiAnalysis.reasoning}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !smartContractService.isReady()}
            >
              {isSubmitting ? 'Creating Intent...' : 'Schedule Transaction'}
            </Button>
          </form>
        </Card>

        {/* PKP Monitoring Panel */}
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <h2 className="text-xl font-bold mb-4 text-purple-800">🤖 Vincent PKP Auto-Execution</h2>
          
          <div className="space-y-4">
            {/* PKP Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">PKP Status</p>
                <Badge variant={isPKPReady ? "default" : "outline"} className={isPKPReady ? "bg-green-500" : ""}>
                  {isPKPReady ? "✅ Ready" : "⏸️ Not Initialized"}
                </Badge>
              </div>
              
              {vincentPkp && !isPKPReady && (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await initializePKP({
                        pkpPublicKey: vincentPkp.publicKey,
                        pkpEthAddress: vincentPkp.ethAddress,
                        vincentAgentId: vincentPkp.vincentAgentId,
                      });
                    } catch (error) {
                      console.error('Failed to initialize PKP:', error);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Initialize PKP
                </Button>
              )}
            </div>

            {/* Monitoring Controls */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monitoring Status</p>
                <Badge variant={isMonitoring ? "default" : "outline"} className={isMonitoring ? "bg-blue-500" : ""}>
                  {isMonitoring ? "🔄 Active" : "⏸️ Stopped"}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                {!isMonitoring ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (address) {
                        startMonitoring(address, {
                          autoExecute: true,
                          usePKP: isPKPReady,
                        });
                      }
                    }}
                    disabled={!address}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Monitoring
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={stopMonitoring}
                    variant="outline"
                  >
                    Stop Monitoring
                  </Button>
                )}
              </div>
            </div>

            {/* Monitoring Config */}
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Auto-Execute: {monitoringConfig.autoExecute ? '✅' : '❌'}</p>
              <p>• Use PKP: {monitoringConfig.usePKP ? '✅' : '❌'}</p>
              <p>• Poll Interval: {monitoringConfig.pollInterval / 1000}s</p>
              <p>• Max Attempts: {monitoringConfig.maxExecutionAttempts}</p>
            </div>

            {/* Monitored Intents */}
            {monitoredIntents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-700">Monitored Intents ({monitoredIntents.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {monitoredIntents.map((intent) => (
                    <div key={intent.intentId} className="p-3 bg-white rounded-md border border-purple-200 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs">ID: {intent.intentId}</p>
                          <Badge variant="outline" className="mt-1">
                            {intent.status}
                          </Badge>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <p>Attempts: {intent.executionAttempts}</p>
                          {intent.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => triggerExecution(intent.intentId)}
                              className="mt-1 h-6 text-xs"
                            >
                              Execute Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Events */}
            {monitoringEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-700">Recent Events</p>
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {monitoringEvents.slice(-5).reverse().map((event, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-purple-100">
                      <span className="font-semibold text-purple-600">{event.type}</span>
                      <span className="text-gray-500 ml-2">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Enhanced Info Card */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="font-semibold mb-3 text-blue-800">🚀 Smart Transaction Scheduler</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2 text-blue-700">✨ Features</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Cross-chain failover automation</li>
                <li>• Gas price optimization</li>
                <li>• PKP-powered execution</li>
                <li>• Real-time monitoring</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-blue-700">🔗 Supported Chains</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Ethereum Sepolia</li>
                <li>• Polygon Mumbai</li>
                <li>• Arbitrum Sepolia</li>
                <li>• Hedera Testnet</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { usePKP } from '../../hooks/usePKP';
import { useIntentMonitoring } from '../../hooks/useIntentMonitoring';
import { useBlockscoutNotifications } from '../../hooks/useBlockscoutNotifications';
import { useGasPrices } from '@/modules/chains/hooks/useGasPrices';
import type { TransactionFormData } from '../../types';
import { smartContractService, type CreateIntentParams } from '../../services/smartContractService';
import { vincentPKPService, type TransactionAnalysis } from '../../services/vincentPKPService';
import { BlockscoutTransactionWidget } from '../BlockscoutTransactionWidget';
import { Button } from '@/globals/components/ui/button';
import { Card } from '@/globals/components/ui/card';
import { Input } from '@/globals/components/ui/input';
import { Label } from '@/globals/components/ui/label';
import { Badge } from '@/globals/components/ui/badge';
import { Alert, AlertDescription } from '@/globals/components/ui/alert';
import { ROUTES } from '@/app/router/consts';
import { useToast } from '@/globals/components/ui/toast';
import { transactionNotificationService } from '../../services/transactionNotificationService';

export const TransactionScheduler = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    address,
    chainId,
    chainName,
    balance,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    switchChain,
    formatAddress,
    isMetaMaskInstalled,
  } = useWalletConnection();

  // Initialize transaction notification service with toast
  useEffect(() => {
    transactionNotificationService.initialize(toast.addToast);
  }, [toast]);

  const [formData, setFormData] = useState<TransactionFormData>({
    token: 'USDC',
    amount: '',
    action: 'TRANSFER',
    recipient: '',
  });

  const [primaryChain, setPrimaryChain] = useState<number>(11155111); // Default to Sepolia
  const [failoverChains, setFailoverChains] = useState<number[]>([]); // Start with empty array
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

  // Blockscout notifications hook
  const { showTransactionToast, showTransactionHistory } = useBlockscoutNotifications();

  // Gas prices hook
  const { 
    gasPrices, 
    congestion, 
    cheapestChain, 
    isLoading: isLoadingGas,
    lastUpdated: gasLastUpdated,
    refetch: refetchGas 
  } = useGasPrices({ refetchInterval: 30000 });

  // Track recent transactions for Blockscout widget
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    hash: string;
    chainId: number;
    timestamp: number;
  }>>([]);

  // Listen for monitoring events and show Blockscout notifications
  useEffect(() => {
    const lastEvent = monitoringEvents[monitoringEvents.length - 1];
    if (!lastEvent) return;

    // Show Blockscout toast for executed transactions
    if (lastEvent.type === 'intent:executed' && lastEvent.data?.txHash && chainId) {
      showTransactionToast(chainId, lastEvent.data.txHash);
      
      // Add to recent transactions
      setRecentTransactions(prev => [{
        hash: lastEvent.data.txHash,
        chainId: chainId,
        timestamp: Date.now(),
      }, ...prev.slice(0, 9)]); // Keep last 10
    }
  }, [monitoringEvents, chainId, showTransactionToast]);

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Initialize smart contract service
  useEffect(() => {
    const initContract = async () => {
      if (isConnected && address && chainId) {
        try {
          // Use environment variable for contract address
          let contractAddress = import.meta.env.VITE_SMART_TRANSACTION_SCHEDULER_ADDRESS;
          
          // If no env var, use chain-specific defaults
          if (!contractAddress) {
            const chainAddresses: Record<number, string> = {
              11155111: '0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F', // Sepolia
              421614: '0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F',   // Arbitrum Sepolia
              11155420: '0x3Da2d0995F2016e02890A5d51B6A5D0Cf6239649', // Optimism Sepolia
              296: '0x43D8e9cdDEb55eee3a1B3D5825C2E467C3616E6F',      // Hedera
            };
            contractAddress = chainAddresses[chainId];
          }
          
          if (!contractAddress) {
            console.error('❌ No contract address configured for chain:', chainId);
            return;
          }
          
          console.log('📋 Initializing contract on chain', chainId, 'at address:', contractAddress);
          await smartContractService.initialize(contractAddress);
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
        }
      }
    };

    initContract();
  }, [isConnected, address, chainId]);

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
      
      // Show toast notification for intent creation
      transactionNotificationService.notifyIntentCreated(
        newIntentId,
        formData.amount,
        formData.token
      );
      
      // Show Blockscout notification if we have a transaction hash
      // Note: Intent creation returns intent ID, actual execution will have tx hash
      // We'll show notifications when monitoring detects execution
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
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#1a1f1a] via-[#0f120f] to-[#1a1f1a] relative overflow-hidden">
        {/* Lime green glow effects */}
        <div className="absolute -top-40 right-1/3 w-[700px] h-[700px] bg-[#a3e635]/20 rounded-full blur-[150px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-[#84cc16]/15 rounded-full blur-[130px]"></div>
        
        <Card className="w-full max-w-md p-8 bg-[#1c1f1c]/90 border-[#a3e635]/20 backdrop-blur-xl shadow-2xl relative z-10">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-white">FailoverX</h1>
            <p className="text-gray-400">
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
              className="w-full bg-[#a3e635] hover:bg-[#84cc16] text-black font-bold shadow-lg rounded-md py-3"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Check if on correct network
  const SEPOLIA_CHAIN_ID = 11155111;
  const isWrongNetwork = chainId !== SEPOLIA_CHAIN_ID;

  // Connected state
  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-[#1a1f1a] via-[#0f120f] to-[#1a1f1a] relative overflow-hidden">
      {/* Lime green glow effects */}
      <div className="absolute -top-32 right-1/3 w-[700px] h-[700px] bg-[#a3e635]/20 rounded-full blur-[150px]"></div>
      <div className="absolute -bottom-32 left-1/4 w-[700px] h-[700px] bg-[#84cc16]/15 rounded-full blur-[130px]"></div>
      <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-[#a3e635]/10 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Wrong Network Warning */}
        {isWrongNetwork && (
          <Alert variant="destructive" className="border-red-500 bg-red-50">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-semibold">⚠️ Wrong Network Detected</p>
                <p className="text-sm">You're on {chainName}. Please switch to Sepolia Testnet to use this app.</p>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await switchChain(SEPOLIA_CHAIN_ID);
                  } catch (err) {
                    console.error('Failed to switch network:', err);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Switch to Sepolia
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Info Header */}
        <Card className="p-6 bg-[#1c1f1c]/80 border-[#a3e635]/30 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Connected Wallet</p>
              <p className="font-mono font-semibold text-white">{formatAddress(address!)}</p>
            </div>
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400">{chainName}</p>
                {isWrongNetwork && <Badge variant="destructive">Wrong Network</Badge>}
                {!isWrongNetwork && <Badge className="bg-green-500 text-white">Sepolia ✓</Badge>}
              </div>
              <p className="font-semibold text-white">{balance} ETH</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate(ROUTES.TRANSACTION_HISTORY.path)} 
                variant="outline"
                className="bg-[#2a2f2a] hover:bg-[#3a3f3a] border-[#a3e635]/30 text-white rounded-md"
              >
                History
              </Button>
              <Button onClick={handleDisconnect} className="bg-[#2a2f2a] hover:bg-[#3a3f3a] border border-[#a3e635]/30 text-white rounded-md">
                Disconnect
              </Button>
            </div>
          </div>
        </Card>

        {/* Vincent AI PKP Section */}
        <Card className="p-6 bg-[#1c1f1c]/80 border-purple-500/30 backdrop-blur-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Vincent AI-Powered PKPs</h2>
          <p className="text-sm text-gray-400 mb-4">
            Create an AI-powered PKP using Vincent that intelligently routes transactions across chains
          </p>
          
          {(pkp || vincentPkp) ? (
            <div className="space-y-2">
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                PKP Created
              </Badge>
              <div className="text-sm space-y-1 text-gray-300">
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
                  className="bg-purple-500 hover:bg-purple-600 text-white mr-2 rounded-md"
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
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-md"
                >
                  {isCreatingVincent ? 'Creating AI PKP...' : 'Create Vincent AI PKP'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Gas Price Monitor */}
        <Card className="p-6 bg-[#1c1f1c]/80 border-[#a3e635]/30 backdrop-blur-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">⛽ Live Gas Prices</h2>
            <div className="flex items-center gap-3">
              {gasLastUpdated && (
                <span className="text-xs text-gray-400">
                  Updated: {gasLastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                size="sm"
                onClick={refetchGas}
                variant="outline"
                className="h-7 text-xs bg-[#2a2f2a] hover:bg-[#3a3f3a] border-[#a3e635]/30 text-white rounded-md"
              >
                Refresh
              </Button>
            </div>
          </div>

          {isLoadingGas ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 bg-[#151815] rounded-md animate-pulse">
                  <div className="h-4 bg-[#2a2f2a] rounded mb-2"></div>
                  <div className="h-6 bg-[#2a2f2a] rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Cheapest Chain Highlight */}
              {cheapestChain && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <span className="text-sm text-green-400 font-medium">
                      Cheapest: {cheapestChain.chainName}
                    </span>
                    <span className="text-lg font-bold text-green-400">
                      {cheapestChain.gasPrice} Gwei
                    </span>
                  </div>
                </div>
              )}

              {/* Gas Prices Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {gasPrices.map((gasPrice) => {
                  const congestionData = congestion.find(c => c.chainId === gasPrice.chainId);
                  const isCheapest = cheapestChain?.chainId === gasPrice.chainId;
                  
                  return (
                    <div
                      key={gasPrice.chainId}
                      className={`p-3 rounded-md border ${
                        isCheapest
                          ? 'border-green-500/50 bg-green-500/10'
                          : gasPrice.status === 'error'
                          ? 'border-red-500/30 bg-red-500/10'
                          : 'border-[#2a2f2a] bg-[#151815]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-xs font-medium text-gray-300 truncate">
                          {gasPrice.chainName.replace(' Sepolia', '').replace(' Testnet', '')}
                        </h3>
                        {gasPrice.status === 'success' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                            Live
                          </span>
                        )}
                      </div>
                      
                      {gasPrice.status === 'success' ? (
                        <>
                          <div className="text-lg font-bold text-white mb-1">
                            {gasPrice.gasPrice} <span className="text-[10px] font-normal text-gray-400">Gwei</span>
                          </div>
                          
                          {congestionData && (
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                congestionData.level === 'low' ? 'bg-green-400' :
                                congestionData.level === 'medium' ? 'bg-yellow-400' :
                                'bg-red-400'
                              }`}></div>
                              <span className={`text-[10px] capitalize ${
                                congestionData.level === 'low' ? 'text-green-400' :
                                congestionData.level === 'medium' ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {congestionData.level}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-red-400">
                          Unavailable
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Transaction Form */}
        <Card className="p-6 bg-[#1c1f1c]/80 border-[#a3e635]/30 backdrop-blur-xl shadow-lg">
          <h2 className="text-xl font-bold mb-6 text-white">Schedule Transaction</h2>
          
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          
          {intentId && (
            <Alert className="mb-4 bg-green-500/20 border-green-500/30">
              <AlertDescription className="text-green-400">
                Transaction intent created! ID: {intentId}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="token" className="text-gray-300">Token</Label>
              <select
                id="token"
                value={formData.token}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange('token', e.target.value)}
                className="w-full px-3 py-2 bg-[#151815] border border-[#2a2f2a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="DAI">DAI</option>
                <option value="USDT">USDT</option>
              </select>
            </div>

            {/* Primary Chain Selection */}
            <div className="space-y-2">
              <Label htmlFor="primaryChain" className="text-gray-300">Primary Chain</Label>
              <select
                id="primaryChain"
                value={primaryChain}
                onChange={(e) => setPrimaryChain(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#151815] border border-[#2a2f2a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value={11155111}>Sepolia</option>
                <option value={421614}>Arbitrum Sepolia</option>
                <option value={11155420}>Optimism Sepolia</option>
                <option value={84532}>Base Sepolia</option>
                <option value={296}>Hedera Testnet</option>
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-300">Amount</Label>
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
              <Label htmlFor="action" className="text-gray-300">Action</Label>
              <select
                id="action"
                value={formData.action}
                onChange={(e) => handleFormChange('action', e.target.value)}
                className="w-full px-3 py-2 bg-[#151815] border border-[#2a2f2a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value="TRANSFER">Transfer</option>
                <option value="SWAP">Swap</option>
              </select>
            </div>

            {/* Recipient (only for Transfer) */}
            {formData.action === 'TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-gray-300">Recipient Address</Label>
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
            <div className="space-y-3">
              <Label className="text-gray-300">Failover Chains (Optional)</Label>
              <div className="space-y-2">
                {[
                  { id: 11155111, name: 'Sepolia' },
                  { id: 421614, name: 'Arbitrum Sepolia' },
                  { id: 11155420, name: 'Optimism Sepolia' },
                  { id: 84532, name: 'Base Sepolia' },
                  { id: 296, name: 'Hedera Testnet' },
                ].filter(chain => chain.id !== primaryChain).map((chain) => (
                  <div key={chain.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`chain-${chain.id}`}
                      checked={failoverChains.includes(chain.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFailoverChains([...failoverChains, chain.id]);
                        } else {
                          setFailoverChains(failoverChains.filter(id => id !== chain.id));
                        }
                      }}
                      className="w-4 h-4 text-[#a3e635] bg-[#151815] border-[#2a2f2a] rounded focus:ring-[#a3e635] focus:ring-2"
                    />
                    <label htmlFor={`chain-${chain.id}`} className="text-sm text-gray-300 cursor-pointer">
                      {chain.name} ({chain.id})
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                If the transaction fails on the primary chain, it will automatically retry on selected chains
              </p>
            </div>

            {/* Max Gas Price */}
            <div className="space-y-2">
              <Label htmlFor="maxGasPrice" className="text-gray-300">Max Gas Price (Gwei)</Label>
              <Input
                id="maxGasPrice"
                type="number"
                placeholder="50"
                value={maxGasPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxGasPrice(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">
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
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 rounded-md"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Get Vincent AI Recommendation'}
                </Button>
              </div>
              
              {aiAnalysis && (
                <Alert className="bg-blue-500/20 border-blue-500/30">
                  <AlertDescription className="text-blue-400">
                    <div className="space-y-2">
                      <p><strong>Vincent AI Recommendation:</strong></p>
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
              className="w-full bg-[#a3e635] hover:bg-[#84cc16] text-black font-bold rounded-md shadow-lg"
              disabled={isSubmitting || !smartContractService.isReady()}
            >
              {isSubmitting ? 'Creating Intent...' : 'Schedule Transaction'}
            </Button>
          </form>
        </Card>

        {/* PKP Monitoring Panel */}
        <Card className="p-6 bg-[#1c1f1c]/80 border-purple-500/30 backdrop-blur-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Vincent PKP Auto-Execution</h2>
          
          <div className="space-y-4">
            {/* PKP Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">PKP Status</p>
                <Badge variant={isPKPReady ? "default" : "outline"} className={isPKPReady ? "bg-green-500 text-white" : "bg-[#2a2f2a] text-gray-300"}>
                  {isPKPReady ? "Ready" : "Not Initialized"}
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
                      transactionNotificationService.notifyPKPInitialized();
                    } catch (error) {
                      console.error('Failed to initialize PKP:', error);
                      transactionNotificationService.notifyError(
                        'PKP Initialization Failed',
                        'Failed to initialize Vincent AI PKP'
                      );
                    }
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-md"
                >
                  Initialize PKP
                </Button>
              )}
            </div>

            {/* Monitoring Controls */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Monitoring Status</p>
                <Badge variant={isMonitoring ? "default" : "outline"} className={isMonitoring ? "bg-blue-500 text-white" : "bg-[#2a2f2a] text-gray-300"}>
                  {isMonitoring ? "Active" : "Stopped"}
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
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                  >
                    Start Monitoring
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={stopMonitoring}
                    className="bg-[#2a2f2a] hover:bg-[#3a3f3a] text-white border border-[#3a3f3a] rounded-md"
                  >
                    Stop Monitoring
                  </Button>
                )}
              </div>
            </div>

            {/* Monitoring Config */}
            <div className="text-xs text-gray-400 space-y-1">
              <p>• Auto-Execute: {monitoringConfig.autoExecute ? 'Yes' : 'No'}</p>
              <p>• Use PKP: {monitoringConfig.usePKP ? 'Yes' : 'No'}</p>
              <p>• Poll Interval: {monitoringConfig.pollInterval / 1000}s</p>
              <p>• Max Attempts: {monitoringConfig.maxExecutionAttempts}</p>
            </div>

            {/* Monitored Intents */}
            {monitoredIntents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-400">Monitored Intents ({monitoredIntents.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {monitoredIntents.map((intent) => (
                    <div key={intent.intentId} className="p-3 bg-[#151815] rounded-md border border-purple-500/30 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-gray-300">ID: {intent.intentId}</p>
                          <Badge className="mt-1 bg-[#2a2f2a] text-gray-300 border-[#3a3f3a]">
                            {intent.status}
                          </Badge>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <p>Attempts: {intent.executionAttempts}</p>
                          {intent.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => triggerExecution(intent.intentId)}
                              className="mt-1 h-6 text-xs bg-[#a3e635] hover:bg-[#84cc16] text-black rounded-md"
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
                <p className="text-sm font-semibold text-purple-400">Recent Events</p>
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {monitoringEvents.slice(-5).reverse().map((event, idx) => (
                    <div key={idx} className="p-2 bg-[#151815] rounded border border-purple-500/30">
                      <span className="font-semibold text-purple-400">{event.type}</span>
                      <span className="text-gray-400 ml-2">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Blockscout Transaction Widget */}
        {isConnected && chainId && (
          <BlockscoutTransactionWidget
            chainId={chainId}
            userAddress={address || undefined}
            recentTransactions={recentTransactions}
          />
        )}

        {/* Sponsor Integration Footer */}
        <Card className="p-6 bg-[#1c1f1c]/80 border-[#a3e635]/30 backdrop-blur-xl shadow-lg">
          <h2 className="text-xl font-bold mb-6 text-center text-white">Powered By</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avail Nexus Card */}
            <div className="p-6 bg-[#151815] border border-[#a3e635]/20 rounded-lg hover:border-[#a3e635]/50 transition-all">
              <div className="flex flex-col items-center text-center space-y-3">
                <img src="/avail-logo.png" alt="Avail Nexus" className="w-16 h-16 object-contain" />
                <h3 className="text-lg font-bold text-white">Avail Nexus</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  ✅ Integrated
                </Badge>
                <p className="text-xs text-gray-400">
                  Cross-chain bridging & unified balance queries
                </p>
              </div>
            </div>

            {/* Hedera Card */}
            <div className="p-6 bg-[#151815] border border-[#a3e635]/20 rounded-lg hover:border-[#a3e635]/50 transition-all">
              <div className="flex flex-col items-center text-center space-y-3">
                <img src="/hedera-logo.svg" alt="Hedera" className="w-16 h-16 object-contain" />
                <h3 className="text-lg font-bold text-white">Hedera</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  ✅ Integrated
                </Badge>
                <p className="text-xs text-gray-400">
                  Ultra-low cost execution ($0.0001/tx)
                </p>
              </div>
            </div>

            {/* Lit Protocol Vincent Card */}
            <div className="p-6 bg-[#151815] border border-[#a3e635]/20 rounded-lg hover:border-[#a3e635]/50 transition-all">
              <div className="flex flex-col items-center text-center space-y-3">
                <img src="/lit-logo.jpg" alt="Lit Protocol" className="w-16 h-16 object-contain rounded-lg" />
                <h3 className="text-lg font-bold text-white">Lit Protocol Vincent</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  ✅ Integrated
                </Badge>
                <p className="text-xs text-gray-400">
                  AI-powered PKPs & intelligent routing
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

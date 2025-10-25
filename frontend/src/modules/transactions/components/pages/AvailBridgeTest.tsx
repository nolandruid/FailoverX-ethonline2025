import { useState } from 'react';
import { ethers } from 'ethers';
import { availBridgeService } from '@/modules/chains/services/availBridgeService';
import { Button } from '@/globals/components/ui/button';
import { Card } from '@/globals/components/ui/card';
import { Input } from '@/globals/components/ui/input';
import { Label } from '@/globals/components/ui/label';
import { Alert, AlertDescription } from '@/globals/components/ui/alert';

/**
 * Test component for Avail Nexus SDK integration
 * Use this to verify the bridge service works correctly
 */
export const AvailBridgeTest = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  
  // Bridge form state
  const [amount, setAmount] = useState('0.01');
  const [fromChain, setFromChain] = useState('11155111'); // Sepolia
  const [toChain, setToChain] = useState('295'); // Hedera
  
  // Results
  const [balances, setBalances] = useState<any>(null);
  const [bridgeResult, setBridgeResult] = useState<any>(null);

  /**
   * Step 1: Connect wallet and initialize Avail SDK
   */
  const handleInitialize = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Check for MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.');
      }

      console.log('[TEST] Requesting wallet connection...');
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const address = accounts[0];
      setWalletAddress(address);
      console.log('[TEST] Connected wallet:', address);

      // Initialize Avail Nexus SDK
      console.log('[TEST] Initializing Avail Nexus SDK...');
      await availBridgeService.initialize(window.ethereum);
      
      setIsInitialized(true);
      setSuccess(`✅ Avail SDK initialized! Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`);
      console.log('[TEST] ✅ Initialization complete');
      
    } catch (err: any) {
      console.error('[TEST] ❌ Initialization failed:', err);
      setError(err.message || 'Failed to initialize');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: Fetch unified balances across chains
   */
  const handleFetchBalances = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!isInitialized) {
        throw new Error('Please initialize the SDK first');
      }

      console.log('[TEST] Fetching unified balances...');
      
      // This will call the real Avail SDK
      const backupChain = await availBridgeService.getOptimalBackupChain(
        parseInt(fromChain),
        walletAddress,
        ethers.utils.parseEther(amount).toString()
      );
      
      setBalances({ backupChain });
      setSuccess(`✅ Optimal backup chain: ${backupChain} (Hedera: 295, Base: 84532)`);
      console.log('[TEST] ✅ Balance check complete');
      
    } catch (err: any) {
      console.error('[TEST] ❌ Balance fetch failed:', err);
      setError(err.message || 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 3: Execute bridge transaction
   */
  const handleBridge = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!isInitialized) {
        throw new Error('Please initialize the SDK first');
      }

      console.log('[TEST] Starting bridge transaction...');
      console.log(`[TEST] From Chain: ${fromChain}, To Chain: ${toChain}, Amount: ${amount} ETH`);
      
      // Execute real bridge via Avail Nexus SDK
      const result = await availBridgeService.bridgeForFailover({
        fromChainId: parseInt(fromChain),
        toChainId: parseInt(toChain),
        token: ethers.constants.AddressZero, // ETH
        amount: ethers.utils.parseEther(amount).toString(),
        recipient: walletAddress,
        userAddress: walletAddress,
      });
      
      setBridgeResult(result);
      
      if (result.success) {
        setSuccess(`✅ Bridge successful! TX: ${result.bridgeTxHash?.slice(0, 10)}...`);
        console.log('[TEST] ✅ Bridge complete:', result);
      } else {
        throw new Error(result.error || 'Bridge failed');
      }
      
    } catch (err: any) {
      console.error('[TEST] ❌ Bridge failed:', err);
      setError(err.message || 'Bridge transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 4: Simulate bridge (preview costs)
   */
  const handleSimulate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!isInitialized) {
        throw new Error('Please initialize the SDK first');
      }

      console.log('[TEST] Simulating bridge...');
      
      const simulation = await availBridgeService.simulateBridge({
        fromChainId: parseInt(fromChain),
        toChainId: parseInt(toChain),
        token: ethers.constants.AddressZero,
        amount: ethers.utils.parseEther(amount).toString(),
        recipient: walletAddress,
        userAddress: walletAddress,
      });
      
      if (simulation) {
        setSuccess(`✅ Simulation complete. Check console for details.`);
        console.log('[TEST] ✅ Simulation result:', simulation);
      } else {
        setSuccess('⚠️ Simulation returned null (SDK may not support this yet)');
      }
      
    } catch (err: any) {
      console.error('[TEST] ❌ Simulation failed:', err);
      setError(err.message || 'Simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-2">🌉 Avail Nexus SDK Test</h1>
        <p className="text-gray-600 mb-6">
          Test the Avail Nexus SDK integration for cross-chain bridging
        </p>

        {/* Status Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>❌ {error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Initialize */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Step 1: Initialize SDK</h2>
          <p className="text-sm text-gray-600 mb-3">
            Connect your wallet and initialize the Avail Nexus SDK
          </p>
          <Button 
            onClick={handleInitialize} 
            disabled={isLoading || isInitialized}
            className="w-full"
          >
            {isLoading ? 'Initializing...' : isInitialized ? '✅ Initialized' : 'Connect & Initialize'}
          </Button>
          {walletAddress && (
            <p className="text-sm text-gray-500 mt-2">
              Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
        </div>

        {/* Step 2: Check Balances */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Step 2: Check Unified Balances</h2>
          <p className="text-sm text-gray-600 mb-3">
            Fetch balances across all chains and find optimal backup
          </p>
          <Button 
            onClick={handleFetchBalances} 
            disabled={isLoading || !isInitialized}
            className="w-full"
            variant="outline"
          >
            {isLoading ? 'Fetching...' : 'Fetch Balances'}
          </Button>
          {balances && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
              <p><strong>Optimal Backup Chain:</strong> {balances.backupChain}</p>
            </div>
          )}
        </div>

        {/* Bridge Configuration */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Step 3: Configure Bridge</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>From Chain ID</Label>
              <Input 
                type="text" 
                value={fromChain}
                onChange={(e) => setFromChain(e.target.value)}
                placeholder="11155111"
              />
              <p className="text-xs text-gray-500 mt-1">Sepolia: 11155111</p>
            </div>
            
            <div>
              <Label>To Chain ID</Label>
              <Input 
                type="text" 
                value={toChain}
                onChange={(e) => setToChain(e.target.value)}
                placeholder="295"
              />
              <p className="text-xs text-gray-500 mt-1">Hedera: 295, Base: 84532</p>
            </div>
          </div>

          <div className="mb-4">
            <Label>Amount (ETH)</Label>
            <Input 
              type="text" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.01"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleSimulate} 
              disabled={isLoading || !isInitialized}
              variant="outline"
            >
              {isLoading ? 'Simulating...' : 'Simulate Bridge'}
            </Button>
            
            <Button 
              onClick={handleBridge} 
              disabled={isLoading || !isInitialized}
            >
              {isLoading ? 'Bridging...' : 'Execute Bridge'}
            </Button>
          </div>
        </div>

        {/* Bridge Result */}
        {bridgeResult && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-2">Bridge Result</h3>
            <div className="text-sm space-y-1">
              <p><strong>Success:</strong> {bridgeResult.success ? '✅ Yes' : '❌ No'}</p>
              {bridgeResult.bridgeTxHash && (
                <p><strong>TX Hash:</strong> {bridgeResult.bridgeTxHash}</p>
              )}
              {bridgeResult.bridgeId && (
                <p><strong>Bridge ID:</strong> {bridgeResult.bridgeId}</p>
              )}
              {bridgeResult.estimatedTime && (
                <p><strong>Est. Time:</strong> {bridgeResult.estimatedTime}s</p>
              )}
              {bridgeResult.error && (
                <p className="text-red-600"><strong>Error:</strong> {bridgeResult.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📝 Testing Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "Connect & Initialize" to connect MetaMask and initialize Avail SDK</li>
            <li>Click "Fetch Balances" to check unified balances across chains</li>
            <li>Configure bridge parameters (chains and amount)</li>
            <li>Click "Simulate Bridge" to preview costs (optional)</li>
            <li>Click "Execute Bridge" to perform real cross-chain bridge</li>
            <li>Check browser console for detailed logs</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

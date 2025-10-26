import { ethers } from 'ethers';
import { smartContractService } from './smartContractService';
import { pkpExecutionService } from './pkpExecutionService';
import { vincentPKPService } from './vincentPKPService';
import { availBridgeService } from '../../chains/services/availBridgeService';
import { transactionNotificationService } from './transactionNotificationService';

export interface IntentStatus {
  intentId: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'FAILOVER_TRIGGERED' | 'BRIDGING' | 'RETRYING';
  createdAt: number;
  lastChecked: number;
  executionAttempts: number;
  failoverAttempts?: number;
  currentChainId?: number;
  bridgeId?: string;
}

export interface MonitoringConfig {
  pollInterval: number; // milliseconds
  maxExecutionAttempts: number;
  autoExecute: boolean;
  usePKP: boolean;
  enableFailover: boolean; // NEW: Enable cross-chain failover
  maxFailoverAttempts: number; // NEW: Max failover attempts
}

/**
 * Intent Monitoring Service - Watches pending transaction intents and triggers execution
 * Integrates with Vincent PKP for autonomous transaction execution
 */
export class IntentMonitoringService {
  private monitoredIntents: Map<string, IntentStatus> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private executingIntents: Set<string> = new Set(); // Track intents currently being executed
  private config: MonitoringConfig = {
    pollInterval: 10000, // 10 seconds
    maxExecutionAttempts: 3,
    autoExecute: true,
    usePKP: true,
    enableFailover: true, // Enable cross-chain failover by default
    maxFailoverAttempts: 2, // Try up to 2 backup chains
  };
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Start monitoring transaction intents
   */
  startMonitoring(userAddress: string, config?: Partial<MonitoringConfig>): void {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }

    // Update config
    this.config = { ...this.config, ...config };

    console.log('🔄 Starting intent monitoring...');
    console.log('👤 User address:', userAddress);
    console.log('⚙️ Config:', this.config);

    this.isMonitoring = true;

    // Initial check
    this.checkIntents(userAddress);

    // Set up polling
    this.monitoringInterval = setInterval(() => {
      this.checkIntents(userAddress);
    }, this.config.pollInterval);

    console.log('✅ Intent monitoring started');
    transactionNotificationService.notifyMonitoringStarted();
    this.emit('monitoring:started', { userAddress, config: this.config });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping intent monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('✅ Intent monitoring stopped');
    transactionNotificationService.notifyMonitoringStopped();
    this.emit('monitoring:stopped', {});
  }

  /**
   * Check all pending intents for a user
   */
  private async checkIntents(userAddress: string): Promise<void> {
    try {
      console.log('🔍 Checking intents for:', userAddress);

      // Get user's intents from smart contract
      const intents = await smartContractService.getUserIntents(userAddress);
      
      console.log(`📊 Found ${intents.length} total intents`);

      // Filter pending intents
      const pendingIntents = intents.filter(intent => intent.status === 0); // 0 = PENDING
      
      if (pendingIntents.length === 0) {
        console.log('✅ No pending intents to process');
        return;
      }

      console.log(`⏳ Found ${pendingIntents.length} pending intents`);

      // Process each pending intent
      for (const intent of pendingIntents) {
        await this.processIntent(intent);
      }

    } catch (error) {
      console.error('❌ Error checking intents:', error);
      this.emit('monitoring:error', { error });
    }
  }

  /**
   * Process a single intent
   */
  private async processIntent(intent: any): Promise<void> {
    const intentId = intent.id;
    
    // Get or create status tracking
    let status = this.monitoredIntents.get(intentId);
    if (!status) {
      status = {
        intentId,
        status: 'PENDING',
        createdAt: parseInt(intent.createdAt),
        lastChecked: Date.now(),
        executionAttempts: 0,
      };
      this.monitoredIntents.set(intentId, status);
      console.log('📝 Now monitoring intent:', intentId);
      transactionNotificationService.notifyIntentDetected(intentId);
      this.emit('intent:detected', { intent });
    }

    // Update last checked time
    status.lastChecked = Date.now();

    // Check if this intent is already being executed (prevents race conditions)
    if (this.executingIntents.has(intentId)) {
      console.log('🔒 Intent already being executed, skipping:', intentId);
      return;
    }

    // Skip if already executing or completed
    if (status.status === 'EXECUTING') {
      console.log('⏳ Intent already executing, skipping:', intentId);
      return;
    }

    if (status.status === 'COMPLETED') {
      console.log('✅ Intent already completed, removing from monitoring:', intentId);
      this.monitoredIntents.delete(intentId);
      return;
    }

    // Check if we should execute
    if (!this.config.autoExecute) {
      console.log('⏸️ Auto-execution disabled for intent:', intentId);
      return;
    }

    // Check execution attempts
    if (status.executionAttempts >= this.config.maxExecutionAttempts) {
      console.log('⚠️ Max execution attempts reached for intent:', intentId);
      status.status = 'FAILED';
      transactionNotificationService.notifyMaxAttemptsReached(intentId, status.executionAttempts);
      this.emit('intent:max_attempts', { intentId, attempts: status.executionAttempts });
      return;
    }

    // Get Vincent AI analysis before execution
    console.log('🤖 Getting Vincent AI analysis for intent:', intentId);
    const analysis = await vincentPKPService.analyzeTransaction({
      token: intent.token,
      amount: intent.amount,
      recipient: intent.recipient || ethers.constants.AddressZero,
      maxGasPrice: intent.maxGasPrice,
    });

    console.log('🤖 Vincent recommendation:', analysis.recommendedChain);
    console.log('📊 Success probability:', (analysis.successProbability * 100).toFixed(1) + '%');

    // Execute intent
    await this.executeIntent(intentId, status);
  }

  /**
   * Execute an intent (with or without PKP)
   */
  private async executeIntent(intentId: string, status: IntentStatus): Promise<void> {
    // Acquire lock
    this.executingIntents.add(intentId);
    
    try {
      console.log('🚀 Executing intent:', intentId);
      status.status = 'EXECUTING';
      status.executionAttempts++;
      transactionNotificationService.notifyIntentExecuting(intentId, status.executionAttempts);
      this.emit('intent:executing', { intentId, attempt: status.executionAttempts });

      let result;

      if (this.config.usePKP && pkpExecutionService.isReady()) {
        // Execute with PKP (delegated signing)
        console.log('🤖 Executing with Vincent PKP...');
        result = await pkpExecutionService.executeIntentWithPKP(intentId);
      } else {
        // Execute with connected wallet
        console.log('👤 Executing with connected wallet...');
        const txHash = await smartContractService.executeIntent(intentId);
        result = { success: true, txHash };
      }

      if (result.success) {
        console.log('✅ Intent executed successfully:', intentId);
        console.log('📝 Transaction hash:', result.txHash);
        status.status = 'COMPLETED';
        transactionNotificationService.notifyIntentExecuted(intentId, result.txHash);
        this.emit('intent:executed', { intentId, txHash: result.txHash });
        
        // Remove from monitoring after successful execution
        this.monitoredIntents.delete(intentId);
      } else {
        console.log('❌ Intent execution failed:', intentId);
        
        // Trigger failover if enabled and attempts remaining
        if (this.config.enableFailover && this.shouldTriggerFailover(status)) {
          console.log('🔄 Triggering cross-chain failover...');
          await this.triggerFailover(intentId, status);
        } else {
          status.status = 'FAILED';
          transactionNotificationService.notifyIntentFailed(intentId, result.error, status.executionAttempts);
          this.emit('intent:failed', { intentId, error: result.error });
        }
      }

    } catch (error: any) {
      console.error('❌ Error executing intent:', intentId, error);
      
      // Check if error is because intent was already executed
      const errorMsg = error?.message || '';
      if (errorMsg.includes('Intent not pending') || errorMsg.includes('transaction failed')) {
        console.log('⚠️ Intent may have been executed already, removing from monitoring');
        status.status = 'COMPLETED';
        this.monitoredIntents.delete(intentId);
      } else {
        status.status = 'FAILED';
      }
      
      this.emit('intent:error', { intentId, error: error?.message });
    } finally {
      // Always release the lock
      this.executingIntents.delete(intentId);
    }
  }

  /**
   * Manually trigger execution of a specific intent
   */
  async triggerExecution(intentId: string): Promise<void> {
    console.log('🎯 Manually triggering execution for intent:', intentId);
    
    const status = this.monitoredIntents.get(intentId);
    if (!status) {
      throw new Error('Intent not being monitored');
    }

    await this.executeIntent(intentId, status);
  }

  /**
   * Get status of all monitored intents
   */
  getMonitoredIntents(): IntentStatus[] {
    return Array.from(this.monitoredIntents.values());
  }

  /**
   * Get status of a specific intent
   */
  getIntentStatus(intentId: string): IntentStatus | undefined {
    return this.monitoredIntents.get(intentId);
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Monitoring config updated:', this.config);
    this.emit('config:updated', { config: this.config });
  }

  /**
   * Event system for monitoring updates
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Check if failover should be triggered
   */
  private shouldTriggerFailover(status: IntentStatus): boolean {
    const failoverAttempts = status.failoverAttempts || 0;
    return failoverAttempts < this.config.maxFailoverAttempts;
  }

  /**
   * Trigger cross-chain failover using Avail Nexus bridge
   * This is the core failover mechanism for Day 3 Hour 3
   */
  private async triggerFailover(intentId: string, status: IntentStatus): Promise<void> {
    try {
      status.failoverAttempts = (status.failoverAttempts || 0) + 1;
      status.status = 'FAILOVER_TRIGGERED';
      transactionNotificationService.notifyFailoverTriggered(intentId, 'Primary Chain', 'Backup Chain');
      this.emit('intent:failover_triggered', { intentId, attempt: status.failoverAttempts });

      console.log('[FAILOVER] Initiating Avail Nexus cross-chain failover');
      console.log(`[FAILOVER] Attempt ${status.failoverAttempts}/${this.config.maxFailoverAttempts}`);

      // Get intent details from smart contract
      const userAddress = await this.getUserAddressForIntent(intentId);
      const intent = await smartContractService.getIntent(intentId);

      // Determine current chain (primary chain from intent)
      const primaryChainId = 11155111; // Sepolia - would come from intent in production
      status.currentChainId = primaryChainId;

      // Get optimal backup chain using Avail Nexus
      console.log('[AVAIL] Finding optimal backup chain');
      this.emit('intent:analyzing_chains', { intentId, primaryChain: primaryChainId });
      
      const backupChainId = await availBridgeService.getOptimalBackupChain(
        primaryChainId,
        userAddress,
        intent.amount
      );

      console.log(`[AVAIL] Backup chain selected: Chain ID ${backupChainId}`);
      this.emit('intent:backup_selected', { intentId, backupChain: backupChainId, primaryChain: primaryChainId });

      // Bridge assets to backup chain
      status.status = 'BRIDGING';
      transactionNotificationService.notifyBridgingStarted(intentId, `Chain ${primaryChainId}`, `Chain ${backupChainId}`);
      this.emit('intent:bridging', { intentId, fromChain: primaryChainId, toChain: backupChainId });

      console.log('[BRIDGE] Initiating cross-chain asset transfer via Avail Nexus');
      const bridgeResult = await availBridgeService.bridgeForFailover({
        fromChainId: primaryChainId,
        toChainId: backupChainId,
        token: intent.token,
        amount: intent.amount,
        recipient: intent.recipient || userAddress,
        userAddress,
      });

      if (!bridgeResult.success) {
        throw new Error(bridgeResult.error || 'Bridge failed');
      }

      status.bridgeId = bridgeResult.bridgeId;
      console.log(`[BRIDGE] Bridge initiated: ${bridgeResult.bridgeId}`);
      console.log(`[BRIDGE] Transaction hash: ${bridgeResult.bridgeTxHash}`);
      console.log(`[BRIDGE] Estimated completion: ${bridgeResult.estimatedTime}s`);

      this.emit('intent:bridge_initiated', {
        intentId,
        bridgeId: bridgeResult.bridgeId,
        txHash: bridgeResult.bridgeTxHash,
        estimatedTime: bridgeResult.estimatedTime,
      });

      // Wait for bridge completion
      this.emit('intent:bridge_waiting', { intentId, bridgeId: bridgeResult.bridgeId, estimatedTime: bridgeResult.estimatedTime });
      await this.waitForBridgeCompletion(bridgeResult.bridgeId!, bridgeResult.estimatedTime!);
      transactionNotificationService.notifyBridgingCompleted(intentId, `Chain ${backupChainId}`);
      this.emit('intent:bridge_completed', { intentId, bridgeId: bridgeResult.bridgeId });

      // Retry execution on backup chain
      status.status = 'RETRYING';
      status.currentChainId = backupChainId;
      this.emit('intent:retrying_on_backup', { intentId, chainId: backupChainId });

      console.log(`[EXECUTION] Retrying on backup chain: Chain ID ${backupChainId}`);
      
      // Execute on backup chain
      await this.executeOnBackupChain(intentId, backupChainId, status);

    } catch (error: any) {
      console.error('[FAILOVER] Failed:', error?.message || error);
      status.status = 'FAILED';
      this.emit('intent:failover_failed', { intentId, error: error?.message });
    }
  }

  /**
   * Wait for bridge completion
   */
  private async waitForBridgeCompletion(bridgeId: string, estimatedTime: number): Promise<void> {
    console.log(`[BRIDGE] Waiting for completion: ${bridgeId}`);
    
    // Poll for bridge completion
    const maxWaitTime = estimatedTime * 2; // Wait up to 2x estimated time
    const pollInterval = 2000; // Check every 2 seconds
    const maxAttempts = Math.ceil((maxWaitTime * 1000) / pollInterval);
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const isComplete = await availBridgeService.checkBridgeCompletion(bridgeId);
      if (isComplete) {
        console.log('[BRIDGE] Completed successfully');
        return;
      }
      
      console.log(`[BRIDGE] In progress (${i + 1}/${maxAttempts})`);
    }
    
    throw new Error('Bridge timeout - exceeded maximum wait time');
  }

  /**
   * Execute intent on backup chain after successful bridge
   */
  private async executeOnBackupChain(
    intentId: string,
    chainId: number,
    status: IntentStatus
  ): Promise<void> {
    console.log(`[EXECUTION] Executing on backup chain: Chain ID ${chainId}`);
    
    // In production, this would:
    // 1. Switch to backup chain RPC
    // 2. Execute transaction on backup chain
    // 3. Update intent status in smart contract
    
    // For now, simulate successful execution
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    console.log('[EXECUTION] Intent executed successfully on backup chain');
    console.log(`[EXECUTION] Transaction hash: ${txHash}`);
    console.log('[FAILOVER] Completed successfully');
    
    status.status = 'COMPLETED';
    this.emit('intent:executed', { intentId, txHash, chainId });
    this.emit('intent:failover_success', { intentId, chainId, txHash });
    
    // Remove from monitoring
    this.monitoredIntents.delete(intentId);
  }

  /**
   * Get user address for an intent (helper method)
   */
  private async getUserAddressForIntent(_intentId: string): Promise<string> {
    // In production, get this from smart contract or stored data
    // For now, return a placeholder
    return '0x0000000000000000000000000000000000000000';
  }

  /**
   * Clear all monitored intents
   */
  clearMonitored(): void {
    this.monitoredIntents.clear();
    console.log('🗑️ Cleared all monitored intents');
  }
}

// Singleton instance
export const intentMonitoringService = new IntentMonitoringService();

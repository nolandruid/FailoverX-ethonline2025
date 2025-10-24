import { ethers } from 'ethers';
import { smartContractService } from './smartContractService';
import { pkpExecutionService } from './pkpExecutionService';
import { vincentPKPService } from './vincentPKPService';

export interface IntentStatus {
  intentId: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: number;
  lastChecked: number;
  executionAttempts: number;
}

export interface MonitoringConfig {
  pollInterval: number; // milliseconds
  maxExecutionAttempts: number;
  autoExecute: boolean;
  usePKP: boolean;
}

/**
 * Intent Monitoring Service - Watches pending transaction intents and triggers execution
 * Integrates with Vincent PKP for autonomous transaction execution
 */
export class IntentMonitoringService {
  private monitoredIntents: Map<string, IntentStatus> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private config: MonitoringConfig = {
    pollInterval: 10000, // 10 seconds
    maxExecutionAttempts: 3,
    autoExecute: true,
    usePKP: true,
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
      this.emit('intent:detected', { intent });
    }

    // Update last checked time
    status.lastChecked = Date.now();

    // Check if we should execute
    if (!this.config.autoExecute) {
      console.log('⏸️ Auto-execution disabled for intent:', intentId);
      return;
    }

    // Check execution attempts
    if (status.executionAttempts >= this.config.maxExecutionAttempts) {
      console.log('⚠️ Max execution attempts reached for intent:', intentId);
      status.status = 'FAILED';
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
    try {
      console.log('🚀 Executing intent:', intentId);
      status.status = 'EXECUTING';
      status.executionAttempts++;
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
        this.emit('intent:executed', { intentId, txHash: result.txHash });
        
        // Remove from monitoring after successful execution
        this.monitoredIntents.delete(intentId);
      } else {
        console.log('❌ Intent execution failed:', intentId);
        status.status = 'FAILED';
        this.emit('intent:failed', { intentId, error: result.error });
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
   * Clear all monitored intents
   */
  clearMonitored(): void {
    this.monitoredIntents.clear();
    console.log('🗑️ Cleared all monitored intents');
  }
}

// Singleton instance
export const intentMonitoringService = new IntentMonitoringService();

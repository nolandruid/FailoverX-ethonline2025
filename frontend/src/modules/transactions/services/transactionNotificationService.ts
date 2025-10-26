import type { Toast } from '@/globals/components/ui/toast';

/**
 * Transaction Notification Service
 * Provides specialized notifications for transaction lifecycle events
 */
export class TransactionNotificationService {
  private toastCallback: ((toast: Omit<Toast, 'id'>) => void) | null = null;

  /**
   * Initialize with toast callback from useToast hook
   */
  initialize(addToast: (toast: Omit<Toast, 'id'>) => void) {
    this.toastCallback = addToast;
  }

  /**
   * Show notification when intent is created
   */
  notifyIntentCreated(intentId: string, amount: string, token: string) {
    this.toastCallback?.({
      type: 'success',
      title: '✅ Transaction Intent Created',
      description: `Intent ${intentId.slice(0, 8)}... created for ${amount} ${token}`,
      duration: 4000,
    });
  }

  /**
   * Show notification when monitoring starts
   */
  notifyMonitoringStarted() {
    this.toastCallback?.({
      type: 'info',
      title: '👁️ Monitoring Started',
      description: 'Watching for pending transaction intents',
      duration: 3000,
    });
  }

  /**
   * Show notification when monitoring stops
   */
  notifyMonitoringStopped() {
    this.toastCallback?.({
      type: 'info',
      title: '⏸️ Monitoring Stopped',
      description: 'Intent monitoring has been paused',
      duration: 3000,
    });
  }

  /**
   * Show notification when intent is detected
   */
  notifyIntentDetected(intentId: string) {
    this.toastCallback?.({
      type: 'info',
      title: '🔍 Intent Detected',
      description: `Monitoring intent ${intentId.slice(0, 8)}...`,
      duration: 3000,
    });
  }

  /**
   * Show notification when intent execution starts
   */
  notifyIntentExecuting(intentId: string, attempt: number, chainName?: string) {
    this.toastCallback?.({
      type: 'info',
      title: '🚀 Executing Transaction',
      description: chainName 
        ? `Attempt ${attempt} on ${chainName} for intent ${intentId.slice(0, 8)}...`
        : `Executing intent ${intentId.slice(0, 8)}... (Attempt ${attempt})`,
      duration: 5000,
    });
  }

  /**
   * Show notification when intent execution succeeds
   */
  notifyIntentExecuted(intentId: string, txHash?: string, chainName?: string) {
    this.toastCallback?.({
      type: 'success',
      title: '✅ Transaction Successful',
      description: chainName
        ? `Intent ${intentId.slice(0, 8)}... executed on ${chainName}`
        : `Intent ${intentId.slice(0, 8)}... executed successfully`,
      duration: 6000,
      action: txHash ? {
        label: 'View Transaction',
        onClick: () => {
          // Open explorer based on chain
          window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank');
        },
      } : undefined,
    });
  }

  /**
   * Show notification when intent execution fails
   */
  notifyIntentFailed(intentId: string, error?: string, attempt?: number) {
    this.toastCallback?.({
      type: 'error',
      title: '❌ Transaction Failed',
      description: error 
        ? `Intent ${intentId.slice(0, 8)}...: ${error}`
        : `Intent ${intentId.slice(0, 8)}... failed${attempt ? ` (Attempt ${attempt})` : ''}`,
      duration: 7000,
    });
  }

  /**
   * Show notification when failover is triggered
   */
  notifyFailoverTriggered(intentId: string, fromChain: string, toChain: string) {
    this.toastCallback?.({
      type: 'warning',
      title: '🔄 Failover Triggered',
      description: `Switching from ${fromChain} to ${toChain} for intent ${intentId.slice(0, 8)}...`,
      duration: 6000,
    });
  }

  /**
   * Show notification when bridging starts
   */
  notifyBridgingStarted(intentId: string, fromChain: string, toChain: string) {
    this.toastCallback?.({
      type: 'info',
      title: '🌉 Bridging Assets',
      description: `Bridging from ${fromChain} to ${toChain} for intent ${intentId.slice(0, 8)}...`,
      duration: 5000,
    });
  }

  /**
   * Show notification when bridging completes
   */
  notifyBridgingCompleted(intentId: string, toChain: string) {
    this.toastCallback?.({
      type: 'success',
      title: '✅ Bridging Complete',
      description: `Assets bridged to ${toChain} for intent ${intentId.slice(0, 8)}...`,
      duration: 5000,
    });
  }

  /**
   * Show notification when max attempts reached
   */
  notifyMaxAttemptsReached(intentId: string, attempts: number) {
    this.toastCallback?.({
      type: 'error',
      title: '⚠️ Max Attempts Reached',
      description: `Intent ${intentId.slice(0, 8)}... failed after ${attempts} attempts`,
      duration: 8000,
    });
  }

  /**
   * Show notification for gas savings
   */
  notifyGasSavings(intentId: string, savedAmount: string, percentage: number, chainName: string) {
    this.toastCallback?.({
      type: 'success',
      title: '💰 Gas Savings!',
      description: `Saved ${savedAmount} ETH (${percentage}%) by using ${chainName} for intent ${intentId.slice(0, 8)}...`,
      duration: 7000,
    });
  }

  /**
   * Show notification when PKP is initialized
   */
  notifyPKPInitialized() {
    this.toastCallback?.({
      type: 'success',
      title: '🤖 PKP Initialized',
      description: 'Vincent AI PKP is ready for autonomous execution',
      duration: 4000,
    });
  }

  /**
   * Show notification when PKP execution starts
   */
  notifyPKPExecution(intentId: string) {
    this.toastCallback?.({
      type: 'info',
      title: '🤖 PKP Executing',
      description: `Vincent AI PKP is executing intent ${intentId.slice(0, 8)}...`,
      duration: 5000,
    });
  }

  /**
   * Show generic error notification
   */
  notifyError(title: string, description?: string) {
    this.toastCallback?.({
      type: 'error',
      title,
      description,
      duration: 6000,
    });
  }

  /**
   * Show generic success notification
   */
  notifySuccess(title: string, description?: string) {
    this.toastCallback?.({
      type: 'success',
      title,
      description,
      duration: 4000,
    });
  }

  /**
   * Show generic info notification
   */
  notifyInfo(title: string, description?: string) {
    this.toastCallback?.({
      type: 'info',
      title,
      description,
      duration: 4000,
    });
  }
}

// Singleton instance
export const transactionNotificationService = new TransactionNotificationService();

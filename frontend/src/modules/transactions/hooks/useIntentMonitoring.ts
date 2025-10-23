import { useState, useEffect, useCallback } from 'react';
import { intentMonitoringService, type IntentStatus, type MonitoringConfig } from '../services/intentMonitoringService';
import { pkpExecutionService, type PKPExecutionConfig } from '../services/pkpExecutionService';

export interface UseIntentMonitoringReturn {
  isMonitoring: boolean;
  monitoredIntents: IntentStatus[];
  startMonitoring: (userAddress: string, config?: Partial<MonitoringConfig>) => void;
  stopMonitoring: () => void;
  triggerExecution: (intentId: string) => Promise<void>;
  config: MonitoringConfig;
  updateConfig: (config: Partial<MonitoringConfig>) => void;
  isPKPReady: boolean;
  initializePKP: (config: PKPExecutionConfig) => Promise<void>;
  events: MonitoringEvent[];
}

export interface MonitoringEvent {
  type: string;
  timestamp: number;
  data: any;
}

/**
 * Hook for monitoring transaction intents with Vincent PKP integration
 */
export function useIntentMonitoring(): UseIntentMonitoringReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoredIntents, setMonitoredIntents] = useState<IntentStatus[]>([]);
  const [config, setConfig] = useState<MonitoringConfig>(intentMonitoringService.getConfig());
  const [isPKPReady, setIsPKPReady] = useState(false);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);

  // Update monitored intents periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const intents = intentMonitoringService.getMonitoredIntents();
      setMonitoredIntents(intents);
    }, 2000); // Update UI every 2 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Set up event listeners
  useEffect(() => {
    const addEvent = (type: string, data: any) => {
      setEvents(prev => [
        ...prev.slice(-19), // Keep last 20 events
        { type, timestamp: Date.now(), data }
      ]);
    };

    // Monitoring events
    const onStarted = (data: any) => {
      setIsMonitoring(true);
      addEvent('monitoring:started', data);
    };

    const onStopped = (data: any) => {
      setIsMonitoring(false);
      addEvent('monitoring:stopped', data);
    };

    const onError = (data: any) => {
      addEvent('monitoring:error', data);
    };

    // Intent events
    const onDetected = (data: any) => {
      addEvent('intent:detected', data);
    };

    const onExecuting = (data: any) => {
      addEvent('intent:executing', data);
    };

    const onExecuted = (data: any) => {
      addEvent('intent:executed', data);
    };

    const onFailed = (data: any) => {
      addEvent('intent:failed', data);
    };

    const onIntentError = (data: any) => {
      addEvent('intent:error', data);
    };

    const onMaxAttempts = (data: any) => {
      addEvent('intent:max_attempts', data);
    };

    // Config events
    const onConfigUpdated = (data: any) => {
      setConfig(data.config);
      addEvent('config:updated', data);
    };

    // Register listeners
    intentMonitoringService.on('monitoring:started', onStarted);
    intentMonitoringService.on('monitoring:stopped', onStopped);
    intentMonitoringService.on('monitoring:error', onError);
    intentMonitoringService.on('intent:detected', onDetected);
    intentMonitoringService.on('intent:executing', onExecuting);
    intentMonitoringService.on('intent:executed', onExecuted);
    intentMonitoringService.on('intent:failed', onFailed);
    intentMonitoringService.on('intent:error', onIntentError);
    intentMonitoringService.on('intent:max_attempts', onMaxAttempts);
    intentMonitoringService.on('config:updated', onConfigUpdated);

    // Cleanup
    return () => {
      intentMonitoringService.off('monitoring:started', onStarted);
      intentMonitoringService.off('monitoring:stopped', onStopped);
      intentMonitoringService.off('monitoring:error', onError);
      intentMonitoringService.off('intent:detected', onDetected);
      intentMonitoringService.off('intent:executing', onExecuting);
      intentMonitoringService.off('intent:executed', onExecuted);
      intentMonitoringService.off('intent:failed', onFailed);
      intentMonitoringService.off('intent:error', onIntentError);
      intentMonitoringService.off('intent:max_attempts', onMaxAttempts);
      intentMonitoringService.off('config:updated', onConfigUpdated);
    };
  }, []);

  // Check PKP status
  useEffect(() => {
    const checkPKP = () => {
      setIsPKPReady(pkpExecutionService.isReady());
    };

    checkPKP();
    const interval = setInterval(checkPKP, 5000);
    return () => clearInterval(interval);
  }, []);

  const startMonitoring = useCallback((userAddress: string, customConfig?: Partial<MonitoringConfig>) => {
    intentMonitoringService.startMonitoring(userAddress, customConfig);
  }, []);

  const stopMonitoring = useCallback(() => {
    intentMonitoringService.stopMonitoring();
  }, []);

  const triggerExecution = useCallback(async (intentId: string) => {
    await intentMonitoringService.triggerExecution(intentId);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<MonitoringConfig>) => {
    intentMonitoringService.updateConfig(newConfig);
  }, []);

  const initializePKP = useCallback(async (pkpConfig: PKPExecutionConfig) => {
    try {
      await pkpExecutionService.initialize(pkpConfig);
      setIsPKPReady(true);
    } catch (error) {
      console.error('Failed to initialize PKP:', error);
      throw error;
    }
  }, []);

  return {
    isMonitoring,
    monitoredIntents,
    startMonitoring,
    stopMonitoring,
    triggerExecution,
    config,
    updateConfig,
    isPKPReady,
    initializePKP,
    events,
  };
}

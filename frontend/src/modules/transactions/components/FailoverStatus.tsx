import { Badge } from '@/globals/components/ui/badge';
import { Card } from '@/globals/components/ui/card';
import { Alert, AlertDescription } from '@/globals/components/ui/alert';
import type { IntentStatus } from '../services/intentMonitoringService';
import type { MonitoringEvent } from '../hooks/useIntentMonitoring';

interface FailoverStatusProps {
  monitoredIntents: IntentStatus[];
  events: MonitoringEvent[];
}

const CHAIN_NAMES: Record<number, string> = {
  11155111: 'Sepolia',
  84532: 'Base Sepolia',
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  295: 'Hedera Testnet',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  EXECUTING: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  CANCELLED: 'bg-gray-500',
  FAILOVER_TRIGGERED: 'bg-orange-500',
  BRIDGING: 'bg-purple-500',
  RETRYING: 'bg-indigo-500',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  EXECUTING: 'Executing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  FAILOVER_TRIGGERED: '🔄 Failover Triggered',
  BRIDGING: '🌉 Bridging Assets',
  RETRYING: '🔄 Retrying on Backup',
};

export const FailoverStatus = ({ monitoredIntents, events }: FailoverStatusProps) => {
  // Get recent failover events (show last 15 for complete flow visibility)
  const failoverEvents = events.filter(e => 
    e.type.includes('failover') || 
    e.type.includes('bridge') || 
    e.type.includes('analyzing') ||
    e.type.includes('backup') ||
    e.type.includes('retrying')
  ).slice(-15);

  const hasActiveFailover = monitoredIntents.some(intent => 
    ['FAILOVER_TRIGGERED', 'BRIDGING', 'RETRYING'].includes(intent.status)
  );

  return (
    <div className="space-y-4">
      {/* Active Failover Alert */}
      {hasActiveFailover && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertDescription className="flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            <div>
              <p className="font-semibold">Cross-Chain Failover Active</p>
              <p className="text-sm text-gray-600">
                Using Avail Nexus to bridge assets to backup chain for retry
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Monitored Intents with Failover Status */}
      {monitoredIntents.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Monitored Intents</h3>
          <div className="space-y-3">
            {monitoredIntents.map((intent) => (
              <div key={intent.intentId} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">
                    Intent #{intent.intentId.slice(0, 8)}...
                  </span>
                  <Badge className={STATUS_COLORS[intent.status]}>
                    {STATUS_LABELS[intent.status]}
                  </Badge>
                </div>

                {/* Execution Attempts */}
                <div className="text-sm text-gray-600">
                  <span>Execution attempts: {intent.executionAttempts}</span>
                  {intent.failoverAttempts !== undefined && intent.failoverAttempts > 0 && (
                    <span className="ml-3 text-orange-600 font-semibold">
                      🔄 Failover attempts: {intent.failoverAttempts}
                    </span>
                  )}
                </div>

                {/* Current Chain */}
                {intent.currentChainId && (
                  <div className="text-sm">
                    <span className="text-gray-600">Current chain: </span>
                    <span className="font-semibold">
                      {CHAIN_NAMES[intent.currentChainId] || `Chain ${intent.currentChainId}`}
                    </span>
                  </div>
                )}

                {/* Bridge ID */}
                {intent.bridgeId && (
                  <div className="text-sm">
                    <span className="text-gray-600">Bridge ID: </span>
                    <span className="font-mono text-xs">{intent.bridgeId}</span>
                  </div>
                )}

                {/* Last Checked */}
                <div className="text-xs text-gray-500">
                  Last checked: {new Date(intent.lastChecked).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Failover Events */}
      {failoverEvents.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Failover Event Log</h3>
          <div className="space-y-1">
            {failoverEvents.map((event, idx) => {
              const eventInfo = getEventInfo(event.type);
              return (
                <div 
                  key={idx} 
                  className={`border-l-4 ${eventInfo.borderColor} pl-3 py-2 text-sm bg-gray-50 rounded-r`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${eventInfo.dotColor}`}></span>
                      <span className="font-medium text-gray-900">{eventInfo.label}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString('en-US', { 
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3
                      })}
                    </span>
                  </div>
                  {event.data && (
                    <div className="text-xs text-gray-700 mt-1 ml-4 font-mono">
                      {formatEventData(event.type, event.data)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Avail Integration Badge */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-xl">🌉</span>
        <span>Powered by Avail Nexus SDK for cross-chain failover</span>
      </div>
    </div>
  );
};

// Helper function to get event information
function getEventInfo(type: string): { label: string; borderColor: string; dotColor: string } {
  const eventMap: Record<string, { label: string; borderColor: string; dotColor: string }> = {
    'intent:failover_triggered': {
      label: 'Transaction Failed - Initiating Failover',
      borderColor: 'border-orange-500',
      dotColor: 'bg-orange-500'
    },
    'intent:analyzing_chains': {
      label: 'Analyzing Available Chains',
      borderColor: 'border-blue-400',
      dotColor: 'bg-blue-400'
    },
    'intent:backup_selected': {
      label: 'Backup Chain Selected',
      borderColor: 'border-cyan-500',
      dotColor: 'bg-cyan-500'
    },
    'intent:bridging': {
      label: 'Initiating Cross-Chain Bridge',
      borderColor: 'border-purple-500',
      dotColor: 'bg-purple-500'
    },
    'intent:bridge_initiated': {
      label: 'Bridge Transaction Submitted',
      borderColor: 'border-purple-600',
      dotColor: 'bg-purple-600'
    },
    'intent:bridge_waiting': {
      label: 'Waiting for Bridge Confirmation',
      borderColor: 'border-indigo-400',
      dotColor: 'bg-indigo-400'
    },
    'intent:bridge_completed': {
      label: 'Bridge Transfer Completed',
      borderColor: 'border-blue-600',
      dotColor: 'bg-blue-600'
    },
    'intent:retrying_on_backup': {
      label: 'Executing Transaction on Backup Chain',
      borderColor: 'border-indigo-600',
      dotColor: 'bg-indigo-600'
    },
    'intent:failover_success': {
      label: 'Failover Completed Successfully',
      borderColor: 'border-green-500',
      dotColor: 'bg-green-500'
    },
    'intent:failover_failed': {
      label: 'Failover Failed',
      borderColor: 'border-red-500',
      dotColor: 'bg-red-500'
    },
  };
  return eventMap[type] || { 
    label: type, 
    borderColor: 'border-gray-500', 
    dotColor: 'bg-gray-500' 
  };
}

// Helper function to format event data
function formatEventData(type: string, data: any): string {
  if (type === 'intent:failover_triggered') {
    return `Failover attempt ${data.attempt} initiated`;
  }
  
  if (type === 'intent:analyzing_chains') {
    const primaryChain = CHAIN_NAMES[data.primaryChain] || `Chain ${data.primaryChain}`;
    return `Primary chain: ${primaryChain} - Finding optimal backup`;
  }
  
  if (type === 'intent:backup_selected') {
    const backupChain = CHAIN_NAMES[data.backupChain] || `Chain ${data.backupChain}`;
    const primaryChain = CHAIN_NAMES[data.primaryChain] || `Chain ${data.primaryChain}`;
    return `Selected ${backupChain} as backup for ${primaryChain}`;
  }
  
  if (type === 'intent:bridging') {
    const fromChain = CHAIN_NAMES[data.fromChain] || `Chain ${data.fromChain}`;
    const toChain = CHAIN_NAMES[data.toChain] || `Chain ${data.toChain}`;
    return `Bridging assets: ${fromChain} → ${toChain}`;
  }
  
  if (type === 'intent:bridge_initiated') {
    return `Tx: ${data.txHash?.slice(0, 10)}...${data.txHash?.slice(-8)} | ETA: ${data.estimatedTime}s`;
  }
  
  if (type === 'intent:bridge_waiting') {
    return `Bridge ID: ${data.bridgeId?.slice(0, 24)}... | Estimated: ${data.estimatedTime}s`;
  }
  
  if (type === 'intent:bridge_completed') {
    return `Bridge ${data.bridgeId?.slice(0, 24)}... confirmed`;
  }
  
  if (type === 'intent:retrying_on_backup') {
    const chainName = CHAIN_NAMES[data.chainId] || `Chain ${data.chainId}`;
    return `Executing on ${chainName}`;
  }
  
  if (type === 'intent:failover_success') {
    const chainName = CHAIN_NAMES[data.chainId] || `Chain ${data.chainId}`;
    return `Success on ${chainName} | Tx: ${data.txHash?.slice(0, 10)}...${data.txHash?.slice(-8)}`;
  }
  
  if (type === 'intent:failover_failed') {
    return `${data.error || 'Unknown error'}`;
  }
  
  // Fallback for unknown event types
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

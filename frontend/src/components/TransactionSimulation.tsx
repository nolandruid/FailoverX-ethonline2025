import { useState } from 'react';
import { useTransactionSimulation } from '../modules/transactions/hooks/useTransactionSimulation';
import type { SimulationContext, RiskFactor } from '../modules/transactions/services/simulationService';
import { TestNavigation } from './TestNavigation';

export function TransactionSimulationTest() {
  const [simulationContext, setSimulationContext] = useState<SimulationContext>({
    type: 'transfer',
    urgency: 'medium',
    amount: '100',
    value: '0.1',
    gasPrice: undefined,
  });

  const { simulations, bestSimulation, isLoading, isError, error, refetch } = useTransactionSimulation({
    context: simulationContext,
  });

  const handleContextChange = (field: keyof SimulationContext, value: any) => {
    setSimulationContext(prev => ({ ...prev, [field]: value }));
  };

  const getRiskSeverityColor = (severity: RiskFactor['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSuccessProbabilityColor = (probability: number) => {
    if (probability >= 85) return 'text-green-600';
    if (probability >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'execute_now': return 'bg-green-50 border-green-200 text-green-800';
      case 'increase_gas': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'wait_for_better_conditions': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'switch_chain': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getChainIcon = (chainName: string) => {
    if (chainName.includes('Hedera')) return '⚡';
    if (chainName.includes('Base')) return '🔵';
    if (chainName.includes('Arbitrum')) return '🔴';
    if (chainName.includes('Optimism')) return '🟡';
    if (chainName.includes('Sepolia')) return '🔷';
    return '⛓️';
  };

  if (isLoading) {
    return (
      <div>
        <TestNavigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <TestNavigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Simulation Error</h2>
            <p className="text-red-600 mb-4">{error?.message}</p>
            <button 
              onClick={refetch}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry Simulation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TestNavigation />
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transaction Simulation Engine
          </h1>
          <p className="text-gray-600">
            Predict transaction success probability and optimize execution strategy
          </p>
        </div>

        {/* Best Recommendation */}
        {bestSimulation && (
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🏆 Best Option</h2>
              <button 
                onClick={refetch}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getChainIcon(bestSimulation.chainName)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{bestSimulation.chainName}</h3>
                  <p className={`text-2xl font-bold ${getSuccessProbabilityColor(bestSimulation.successProbability)}`}>
                    {bestSimulation.successProbability}% Success
                  </p>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600">Estimated Cost</div>
                <div className="font-semibold">{bestSimulation.estimatedGasCost}</div>
                <div className="text-sm text-gray-500">{bestSimulation.estimatedGasCostUSD}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600">Execution Time</div>
                <div className="font-semibold">{bestSimulation.executionTime}</div>
              </div>
            </div>

            <div className={`mt-4 p-3 rounded border ${getRecommendationColor(bestSimulation.recommendation.action)}`}>
              <div className="font-medium capitalize">
                {bestSimulation.recommendation.action.replace('_', ' ')}
              </div>
              <div className="text-sm mt-1">{bestSimulation.recommendation.reasoning}</div>
              {bestSimulation.recommendation.suggestedGasPrice && (
                <div className="text-sm mt-1">
                  Suggested gas price: {bestSimulation.recommendation.suggestedGasPrice.toFixed(2)} Gwei
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Transaction Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={simulationContext.type}
                onChange={(e) => handleContextChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="transfer">Transfer</option>
                <option value="swap">DEX Swap</option>
                <option value="contract_call">Contract Call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={simulationContext.value || ''}
                onChange={(e) => handleContextChange('value', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gas Price (Gwei)</label>
              <input
                type="number"
                value={simulationContext.gasPrice || ''}
                onChange={(e) => handleContextChange('gasPrice', parseFloat(e.target.value) || undefined)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gas Limit</label>
              <input
                type="number"
                value={simulationContext.gasLimit || ''}
                onChange={(e) => handleContextChange('gasLimit', parseInt(e.target.value) || undefined)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={simulationContext.urgency}
                onChange={(e) => handleContextChange('urgency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* All Chain Simulations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Cross-Chain Simulation Results</h3>
          
          <div className="space-y-4">
            {simulations.map((simulation) => (
              <div key={simulation.chainId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getChainIcon(simulation.chainName)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{simulation.chainName}</h4>
                      <div className={`text-lg font-bold ${getSuccessProbabilityColor(simulation.successProbability)}`}>
                        {simulation.successProbability}% Success Probability
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{simulation.estimatedGasCost}</div>
                    <div className="text-sm text-gray-500">{simulation.estimatedGasCostUSD}</div>
                    <div className="text-sm text-gray-500">~{simulation.executionTime}</div>
                  </div>
                </div>

                {/* Risk Factors */}
                {simulation.riskFactors.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Risk Factors:</div>
                    <div className="flex flex-wrap gap-2">
                      {simulation.riskFactors.map((risk, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs border ${getRiskSeverityColor(risk.severity)}`}
                        >
                          {risk.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className={`p-3 rounded border ${getRecommendationColor(simulation.recommendation.action)}`}>
                  <div className="font-medium text-sm capitalize">
                    {simulation.recommendation.action.replace('_', ' ')}
                  </div>
                  <div className="text-xs mt-1">{simulation.recommendation.reasoning}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Context Debug */}
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-gray-800">
            Simulation Context (Debug)
          </summary>
          <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
            {JSON.stringify(simulationContext, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

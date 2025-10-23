import { useState } from 'react';
import { ChainRecommendation, QuickRecommendations } from './ChainRecommendation';
import { TestNavigation } from './TestNavigation';
import type { TransactionContext } from '../modules/chains/services/chainSelectionService';

export function ChainSelectionTest() {
  const [customContext, setCustomContext] = useState<TransactionContext>({
    type: 'transfer',
    urgency: 'medium',
    amount: '100',
  });

  const handleContextChange = (field: keyof TransactionContext, value: any) => {
    setCustomContext(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <TestNavigation />
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Smart Chain Selection Algorithm
          </h1>
          <p className="text-gray-600">
            AI-powered chain recommendations based on gas prices, speed, and congestion
          </p>
        </div>

        {/* Quick Recommendations */}
        <QuickRecommendations />

        {/* Custom Transaction Context */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Custom Transaction Analysis</h3>
          
          {/* Transaction Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={customContext.type}
                onChange={(e) => handleContextChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="transfer">Simple Transfer</option>
                <option value="swap">DeFi Swap</option>
                <option value="contract_call">Contract Call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgency
              </label>
              <select
                value={customContext.urgency}
                onChange={(e) => handleContextChange('urgency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low (Save Money)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Speed First)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USD)
              </label>
              <input
                type="number"
                value={customContext.amount || ''}
                onChange={(e) => handleContextChange('amount', e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Gas (Gwei)
              </label>
              <input
                type="number"
                value={customContext.maxGasPrice || ''}
                onChange={(e) => handleContextChange('maxGasPrice', parseFloat(e.target.value))}
                placeholder="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Custom Recommendation */}
          <ChainRecommendation 
            context={customContext}
            className="border-indigo-200 bg-indigo-50"
          />
        </div>

        {/* Algorithm Explanation */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">How the Algorithm Works</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Scoring Factors</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <strong>Gas Cost:</strong> Lower gas prices get higher scores
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <strong>Speed:</strong> Faster block times preferred
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <strong>Congestion:</strong> Less congested networks favored
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <strong>Reliability:</strong> Network uptime and success rates
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 mb-2">Transaction Type Weights</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Simple Transfer</div>
                  <div className="text-gray-600">Prioritizes low cost (40%) and speed (30%)</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">DeFi Swap</div>
                  <div className="text-gray-600">Balances speed (40%) and cost (30%)</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Contract Call</div>
                  <div className="text-gray-600">Emphasizes reliability (20%) and low congestion (30%)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>💡 Pro Tip:</strong> The algorithm automatically adjusts weights based on urgency. 
              "High urgency" prioritizes speed over cost, while "Low urgency" maximizes savings.
            </p>
          </div>
        </div>

        {/* Current Context Display */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Current Analysis Context</h4>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(customContext, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

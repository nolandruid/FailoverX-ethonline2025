import { useChainSelection, useQuickRecommendation } from '../modules/chains/hooks/useChainSelection';
import type { TransactionContext } from '../modules/chains/services/chainSelectionService';

interface ChainRecommendationProps {
  context?: TransactionContext;
  scenario?: 'cheapest' | 'fastest' | 'balanced';
  showAlternatives?: boolean;
  className?: string;
}

export function ChainRecommendation({ 
  context, 
  scenario, 
  showAlternatives = true,
  className = '' 
}: ChainRecommendationProps) {
  // Use either context-based or scenario-based selection
  const contextSelection = useChainSelection({
    context: context!,
    enabled: !!context,
  });
  
  const scenarioSelection = useQuickRecommendation(scenario!);
  
  const { selection, isLoading, isError, error } = context 
    ? contextSelection 
    : scenarioSelection;

  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (isError || !selection) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-red-800 font-medium">Unable to get chain recommendation</div>
        <div className="text-red-600 text-sm mt-1">
          {error?.message || 'Please try again later'}
        </div>
      </div>
    );
  }

  const getChainIcon = (chainName: string) => {
    if (chainName.includes('Hedera')) return '⚡';
    if (chainName.includes('Base')) return '🔵';
    if (chainName.includes('Arbitrum')) return '🔴';
    if (chainName.includes('Optimism')) return '🟡';
    if (chainName.includes('Sepolia')) return '🔷';
    return '⛓️';
  };

  const getSavingsColor = (percentage: number) => {
    if (percentage >= 50) return 'text-green-600';
    if (percentage >= 20) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Recommended Chain */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getChainIcon(selection.recommendedChain.name)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {selection.recommendedChain.name}
            </h3>
            <p className="text-sm text-gray-600 capitalize">
              {scenario || context?.type} • {context?.urgency || 'optimal'} priority
            </p>
          </div>
        </div>
        
        {selection.gasSavings && (
          <div className="text-right">
            <div className={`font-bold ${getSavingsColor(selection.gasSavings.percentage)}`}>
              {selection.gasSavings.percentage}% cheaper
            </div>
            <div className="text-xs text-gray-500">
              Save {selection.gasSavings.amount}
            </div>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div className="mb-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Why this chain:</span> {selection.reasoning}
        </p>
      </div>

      {/* Alternative Chains */}
      {showAlternatives && selection.alternativeChains.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Alternative Options
          </h4>
          <div className="space-y-2">
            {selection.alternativeChains.slice(0, 2).map((chain) => (
              <div key={chain.chainId} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{getChainIcon(chain.name)}</span>
                <span className="text-gray-600">{chain.name}</span>
                <span className="text-xs text-gray-400">
                  {chain.blockTime}s blocks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Quick recommendation buttons component
export function QuickRecommendations({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-3">Quick Recommendations</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChainRecommendation 
          scenario="cheapest" 
          showAlternatives={false}
          className="border-green-200 bg-green-50"
        />
        <ChainRecommendation 
          scenario="fastest" 
          showAlternatives={false}
          className="border-blue-200 bg-blue-50"
        />
        <ChainRecommendation 
          scenario="balanced" 
          showAlternatives={false}
          className="border-purple-200 bg-purple-50"
        />
      </div>
    </div>
  );
}

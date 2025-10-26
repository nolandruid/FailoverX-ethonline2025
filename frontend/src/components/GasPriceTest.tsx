import { useGasPrices } from '../modules/chains';
import { TestNavigation } from './TestNavigation';

export function GasPriceTest() {
  const { 
    gasPrices, 
    congestion, 
    cheapestChain, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    lastUpdated 
  } = useGasPrices();

  if (isLoading) {
    return (
      <div>
        <TestNavigation />
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Gas Price Monitor</h2>
          <div className="animate-pulse">Loading gas prices...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <TestNavigation />
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error Loading Gas Prices</h2>
          <p className="text-red-500 mb-4">{error?.message}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TestNavigation />
      <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gas Price Monitor</h2>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={refetch}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Cheapest Chain Highlight */}
      {cheapestChain && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">🏆 Cheapest Chain Right Now</h3>
          <div className="flex items-center gap-4">
            <span className="font-medium">{cheapestChain.chainName}</span>
            <span className="text-lg font-bold text-green-600">
              {cheapestChain.gasPrice} Gwei
            </span>
            <span className="text-sm text-gray-600">({cheapestChain.symbol})</span>
          </div>
        </div>
      )}

      {/* Gas Prices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {gasPrices.map((gasPrice) => {
          const congestionData = congestion.find(c => c.chainId === gasPrice.chainId);
          const isCheapest = cheapestChain?.chainId === gasPrice.chainId;
          
          return (
            <div 
              key={gasPrice.chainId}
              className={`p-4 rounded-lg border-2 ${
                isCheapest 
                  ? 'border-green-400 bg-green-50' 
                  : gasPrice.status === 'error'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm">{gasPrice.chainName}</h3>
                {gasPrice.status === 'success' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                    Live
                  </span>
                )}
                {gasPrice.status === 'error' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                    Error
                  </span>
                )}
              </div>
              
              {gasPrice.status === 'success' ? (
                <>
                  <div className="text-2xl font-bold mb-1">
                    {gasPrice.gasPrice} <span className="text-sm font-normal">Gwei</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {gasPrice.symbol} • Chain {gasPrice.chainId}
                  </div>
                  
                  {congestionData && (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        congestionData.level === 'low' ? 'bg-green-400' :
                        congestionData.level === 'medium' ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`}></div>
                      <span className="text-xs capitalize">
                        {congestionData.level} congestion ({congestionData.congestionScore}%)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-red-600">
                  {gasPrice.error || 'Failed to load'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Network Congestion Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Network Congestion Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {congestion.map((network) => (
            <div key={network.chainId} className="text-sm">
              <div className="font-medium">Chain {network.chainId}</div>
              <div className={`capitalize ${
                network.level === 'low' ? 'text-green-600' :
                network.level === 'medium' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {network.level} ({network.congestionScore}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Data (for debugging) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          Show Raw Data (Debug)
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
          {JSON.stringify({ gasPrices, congestion, cheapestChain }, null, 2)}
        </pre>
      </details>
      </div>
    </div>
  );
}

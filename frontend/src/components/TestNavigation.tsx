import { Link } from 'react-router-dom';

export function TestNavigation() {
  return (
    <nav className="bg-gray-800 text-white p-4 mb-6">
      <div className="max-w-4xl mx-auto flex gap-4">
        <Link 
          to="/" 
          className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Home
        </Link>
        <Link 
          to="/gas-test" 
          className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          🔥 Gas Price Test
        </Link>
        <Link 
          to="/chain-selection-test" 
          className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          🧠 Chain Selection AI
        </Link>
        <Link 
          to="/transaction-simulation-test" 
          className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          🎯 Transaction Simulation
        </Link>
        <Link 
          to="/scheduler" 
          className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Scheduler
        </Link>
      </div>
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';

export function TestNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">⚡ Smart TX Scheduler</span>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                isActive('/') 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'hover:bg-white/20'
              }`}
            >
              🏠 Home
            </Link>
            <Link 
              to="/gas-test" 
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                isActive('/gas-test') 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'hover:bg-white/20'
              }`}
            >
              🔥 Gas Monitor
            </Link>
            <Link 
              to="/chain-selection-test" 
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                isActive('/chain-selection-test') 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'hover:bg-white/20'
              }`}
            >
              🧠 Chain AI
            </Link>
            <Link 
              to="/transaction-simulation-test" 
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                isActive('/transaction-simulation-test') 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'hover:bg-white/20'
              }`}
            >
              🎯 Simulation
            </Link>
            <Link 
              to="/scheduler" 
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                isActive('/scheduler') 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'hover:bg-white/20'
              }`}
            >
              📅 Scheduler
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

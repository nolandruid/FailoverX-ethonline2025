import { useState, useEffect } from 'react';

export const MetaMaskTest = () => {
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
      setHasMetaMask(true);
      console.log('✅ MetaMask detected!');
    } else {
      console.log('❌ MetaMask not detected');
    }
  }, []);

  const handleConnect = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);
      setError(null);
      console.log('Connected account:', accounts[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      console.error('Connection error:', err);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>MetaMask Connection Test</h1>

      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <p><strong>MetaMask Status:</strong> {hasMetaMask ? '✅ Installed' : '❌ Not installed'}</p>
        <p><strong>window.ethereum:</strong> {typeof window.ethereum}</p>

        {hasMetaMask && (
          <button
            onClick={handleConnect}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Connect MetaMask
          </button>
        )}

        {account && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e9' }}>
            <p><strong>Connected Account:</strong></p>
            <code>{account}</code>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffebee', color: '#c62828' }}>
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Debugging Info:</h3>
        <pre style={{ fontSize: '12px' }}>
          {JSON.stringify({
            hasWindow: typeof window !== 'undefined',
            hasEthereum: typeof window.ethereum !== 'undefined',
            isMetaMask: window.ethereum?.isMetaMask || false,
            provider: window.ethereum ? 'Available' : 'Not available'
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

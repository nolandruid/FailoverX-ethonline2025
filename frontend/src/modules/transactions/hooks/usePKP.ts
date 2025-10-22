import { useState, useCallback } from 'react';
import { pkpService, type PKPCreationResult } from '../services/pkpService';
import { simplePKPService } from '../services/simplePKPService';

interface UsePKPReturn {
  pkp: PKPCreationResult | null;
  isCreating: boolean;
  isInitializing: boolean;
  error: string | null;
  createPKP: () => Promise<void>;
  clearError: () => void;
  isReady: boolean;
}

export const usePKP = (): UsePKPReturn => {
  const [pkp, setPkp] = useState<PKPCreationResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize PKP service
   */
  const initializeService = useCallback(async () => {
    if (pkpService.isReady()) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      await pkpService.initialize();
    } catch (err: any) {
      console.error('Failed to initialize PKP service:', err);
      setError(err?.message || 'Failed to initialize PKP service');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Create a new PKP with fallback to root implementation
   */
  const createPKP = useCallback(async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Try the main PKP service first
      if (!pkpService.isReady()) {
        await initializeService();
      }

      // Create PKP
      const pkpResult = await pkpService.createPKP();
      setPkp(pkpResult);
      
      console.log('✅ PKP created successfully:', pkpResult);
    } catch (err: any) {
      console.error('❌ Main PKP service failed:', err);
      
      // Fallback to simplified service with instructions
      try {
        const fallbackResult = await simplePKPService.createPKPWithRootScript();
        setError(`${err?.message || 'PKP creation failed'}. ${fallbackResult.message}`);
      } catch (fallbackErr: any) {
        setError(err?.message || 'Failed to create PKP. Please try the root implementation.');
      }
    } finally {
      setIsCreating(false);
    }
  }, [initializeService]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    pkp,
    isCreating,
    isInitializing,
    error,
    createPKP,
    clearError,
    isReady: pkpService.isReady(),
  };
};

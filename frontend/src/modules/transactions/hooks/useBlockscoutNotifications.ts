import { useNotification, useTransactionPopup } from '@blockscout/app-sdk';

/**
 * Hook for Blockscout transaction notifications and history
 * Wraps the Blockscout SDK hooks for easier integration
 */
export const useBlockscoutNotifications = () => {
  const { openTxToast } = useNotification();
  const { openPopup } = useTransactionPopup();

  /**
   * Show transaction toast notification
   * @param chainId - Chain ID as string (e.g., "11155111" for Sepolia)
   * @param txHash - Transaction hash
   */
  const showTransactionToast = async (chainId: number | string, txHash: string) => {
    try {
      console.log('[BLOCKSCOUT] Showing transaction toast:', { chainId, txHash });
      await openTxToast(String(chainId), txHash);
    } catch (error) {
      console.error('[BLOCKSCOUT] Failed to show transaction toast:', error);
    }
  };

  /**
   * Show transaction history popup
   * @param chainId - Chain ID as string
   * @param address - Optional address to filter transactions
   */
  const showTransactionHistory = (chainId: number | string, address?: string) => {
    try {
      console.log('[BLOCKSCOUT] Opening transaction history:', { chainId, address });
      openPopup({
        chainId: String(chainId),
        address,
      });
    } catch (error) {
      console.error('[BLOCKSCOUT] Failed to open transaction history:', error);
    }
  };

  return {
    showTransactionToast,
    showTransactionHistory,
  };
};

import { transactionHistoryService } from '@/modules/transactions/services/transactionHistoryService';
import type { TransactionHistoryItem } from '@/modules/transactions/types';
import type { DashboardStats, ChainUsage, GasSavingsData, FailoverStats } from '../types';

/**
 * Chain ID to Name mapping
 */
const CHAIN_NAMES: Record<number, string> = {
  11155111: 'Sepolia',
  80001: 'Mumbai',
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  296: 'Hedera Testnet',
  84532: 'Base Sepolia',
};

/**
 * Dashboard Service
 * Aggregates transaction data and calculates statistics
 */
export class DashboardService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(userAddress: string): Promise<DashboardStats> {
    const history = await transactionHistoryService.getUserTransactionHistory(userAddress);

    const totalTransactions = history.length;
    const successfulTransactions = history.filter(h => h.status === 'SUCCESS').length;
    const failedTransactions = history.filter(h => h.status === 'FAILED').length;
    const pendingTransactions = history.filter(h => h.status === 'PENDING').length;

    const successRate = totalTransactions > 0 
      ? (successfulTransactions / totalTransactions) * 100 
      : 0;

    const totalGasSaved = history
      .reduce((sum, h) => sum + parseFloat(h.gasSaved?.amount || '0'), 0)
      .toFixed(6);

    const averageGasSaved = totalTransactions > 0
      ? (parseFloat(totalGasSaved) / totalTransactions).toFixed(6)
      : '0';

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      totalGasSaved,
      averageGasSaved,
    };
  }

  /**
   * Get chain usage statistics
   */
  async getChainUsage(userAddress: string): Promise<ChainUsage[]> {
    const history = await transactionHistoryService.getUserTransactionHistory(userAddress);

    // Count transactions per chain
    const chainMap = new Map<number, {
      count: number;
      success: number;
      fail: number;
    }>();

    history.forEach(item => {
      // Count primary chain
      if (!chainMap.has(item.primaryChainId)) {
        chainMap.set(item.primaryChainId, { count: 0, success: 0, fail: 0 });
      }
      const primaryStats = chainMap.get(item.primaryChainId)!;
      primaryStats.count++;
      if (item.status === 'SUCCESS' && !item.finalChainId) {
        primaryStats.success++;
      } else if (item.status === 'FAILED') {
        primaryStats.fail++;
      }

      // Count final chain if different (failover occurred)
      if (item.finalChainId && item.finalChainId !== item.primaryChainId) {
        if (!chainMap.has(item.finalChainId)) {
          chainMap.set(item.finalChainId, { count: 0, success: 0, fail: 0 });
        }
        const finalStats = chainMap.get(item.finalChainId)!;
        finalStats.count++;
        if (item.status === 'SUCCESS') {
          finalStats.success++;
        }
      }
    });

    const totalTransactions = history.length;

    // Convert to array and calculate percentages
    const chainUsage: ChainUsage[] = Array.from(chainMap.entries()).map(([chainId, stats]) => ({
      chainId,
      chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      transactionCount: stats.count,
      successCount: stats.success,
      failCount: stats.fail,
      percentage: totalTransactions > 0 
        ? Math.round((stats.count / totalTransactions) * 100) 
        : 0,
    }));

    // Sort by transaction count (descending)
    chainUsage.sort((a, b) => b.transactionCount - a.transactionCount);

    return chainUsage;
  }

  /**
   * Get gas savings breakdown
   */
  async getGasSavingsData(userAddress: string): Promise<GasSavingsData> {
    const history = await transactionHistoryService.getUserTransactionHistory(userAddress);

    const totalSaved = history
      .reduce((sum, h) => sum + parseFloat(h.gasSaved?.amount || '0'), 0)
      .toFixed(6);

    // Group savings by chain
    const savingsByChainMap = new Map<string, number>();
    
    history.forEach(item => {
      if (item.gasSaved && item.finalChainName) {
        const current = savingsByChainMap.get(item.finalChainName) || 0;
        savingsByChainMap.set(
          item.finalChainName,
          current + parseFloat(item.gasSaved.amount)
        );
      }
    });

    const savingsByChain = Array.from(savingsByChainMap.entries())
      .map(([chainName, saved]) => ({
        chainName,
        saved: saved.toFixed(6),
        percentage: parseFloat(totalSaved) > 0
          ? Math.round((saved / parseFloat(totalSaved)) * 100)
          : 0,
      }))
      .sort((a, b) => parseFloat(b.saved) - parseFloat(a.saved));

    return {
      totalSaved,
      savingsByChain,
    };
  }

  /**
   * Get failover statistics
   */
  async getFailoverStats(userAddress: string): Promise<FailoverStats> {
    const history = await transactionHistoryService.getUserTransactionHistory(userAddress);

    const transactionsWithFailover = history.filter(h => h.failoverAttempts.length > 0);
    const totalFailovers = transactionsWithFailover.length;
    
    const successfulFailovers = transactionsWithFailover.filter(
      h => h.status === 'SUCCESS' && h.finalChainId !== h.primaryChainId
    ).length;

    const failedFailovers = transactionsWithFailover.filter(
      h => h.status === 'FAILED'
    ).length;

    // Calculate average failover time (mock - would need actual timing data)
    const averageFailoverTime = totalFailovers > 0 ? 15 : 0; // Mock: 15 seconds average

    // Find most used backup chain
    const backupChainCounts = new Map<string, number>();
    transactionsWithFailover.forEach(item => {
      if (item.finalChainName && item.finalChainName !== item.primaryChainName) {
        const count = backupChainCounts.get(item.finalChainName) || 0;
        backupChainCounts.set(item.finalChainName, count + 1);
      }
    });

    let mostUsedBackupChain = 'N/A';
    let maxCount = 0;
    backupChainCounts.forEach((count, chain) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedBackupChain = chain;
      }
    });

    return {
      totalFailovers,
      successfulFailovers,
      failedFailovers,
      averageFailoverTime,
      mostUsedBackupChain,
    };
  }

  /**
   * Get recent activity (last 7 days)
   */
  async getRecentActivity(userAddress: string): Promise<TransactionHistoryItem[]> {
    const history = await transactionHistoryService.getUserTransactionHistory(userAddress);
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentTransactions = history.filter(h => h.createdAt >= sevenDaysAgo);
    
    // Sort by date (newest first)
    recentTransactions.sort((a, b) => b.createdAt - a.createdAt);
    
    return recentTransactions.slice(0, 10); // Return last 10
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userAddress: string) {
    const history = await transactionHistoryService.getUserTransactionHistory(userAddress);
    
    const totalTransactions = history.length;
    const withFailover = history.filter(h => h.failoverAttempts.length > 0).length;
    const failoverRate = totalTransactions > 0
      ? (withFailover / totalTransactions) * 100
      : 0;

    const avgGasSaved = history.length > 0
      ? history.reduce((sum, h) => sum + parseFloat(h.gasSaved?.amount || '0'), 0) / history.length
      : 0;

    return {
      totalTransactions,
      failoverRate: Math.round(failoverRate * 10) / 10,
      averageGasSaved: avgGasSaved.toFixed(6),
      transactionsWithSavings: history.filter(h => h.gasSaved).length,
    };
  }
}

// Singleton instance
export const dashboardService = new DashboardService();

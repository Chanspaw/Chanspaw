const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AnalyticsService {
  /**
   * Get comprehensive dashboard analytics
   */
  static async getDashboardAnalytics() {
    try {
      const [
        userStats,
        financialStats,
        gameStats,
        transactionStats,
        recentActivity,
        topUsers,
        systemHealth
      ] = await Promise.all([
        this.getUserAnalytics(),
        this.getFinancialAnalytics(),
        this.getGameAnalytics(),
        this.getTransactionAnalytics(),
        this.getRecentActivity(),
        this.getTopUsers(),
        this.getSystemHealthMetrics()
      ]);

      return {
        userStats,
        financialStats,
        gameStats,
        transactionStats,
        recentActivity,
        topUsers,
        systemHealth,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        verifiedUsers,
        activeUsers,
        newUsers30Days,
        newUsers7Days,
        newUsers24Hours,
        userGrowth,
        userRetention,
        topCountries,
        userEngagement
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isVerified: true } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
        this.calculateUserGrowth(),
        this.calculateUserRetention(),
        this.getTopCountries(),
        this.calculateUserEngagement()
      ]);

      return {
        totalUsers,
        verifiedUsers,
        activeUsers,
        newUsers30Days,
        newUsers7Days,
        newUsers24Hours,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0,
        activeRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0,
        userGrowth,
        userRetention,
        topCountries,
        userEngagement
      };
    } catch (error) {
      console.error('❌ Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get financial analytics
   */
  static async getFinancialAnalytics() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalRealBalance,
        totalVirtualBalance,
        totalTransactions,
        transactions30Days,
        transactions7Days,
        revenue30Days,
        revenue7Days,
        averageTransaction,
        topSpenders,
        commissionStats
      ] = await Promise.all([
        prisma.user.aggregate({
          _sum: { real_balance: true }
        }),
        prisma.user.aggregate({
          _sum: { virtual_balance: true }
        }),
        prisma.transaction.count(),
        prisma.transaction.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        this.calculateRevenue(thirtyDaysAgo),
        this.calculateRevenue(sevenDaysAgo),
        prisma.transaction.aggregate({
          _avg: { amount: true }
        }),
        this.getTopSpenders(),
        this.getCommissionStats()
      ]);

      return {
        totalRealBalance: totalRealBalance._sum.real_balance || 0,
        totalVirtualBalance: totalVirtualBalance._sum.virtual_balance || 0,
        totalTransactions,
        transactions30Days,
        transactions7Days,
        revenue30Days,
        revenue7Days,
        averageTransaction: averageTransaction._avg.amount || 0,
        topSpenders,
        commissionStats,
        transactionGrowth: this.calculateGrowthRate(transactions30Days, transactions7Days)
      };
    } catch (error) {
      console.error('❌ Error getting financial analytics:', error);
      throw error;
    }
  }

  /**
   * Get game analytics
   */
  static async getGameAnalytics() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalGames,
        games30Days,
        games7Days,
        activeGames,
        popularGames,
        gameRevenue,
        playerStats,
        matchmakingStats
      ] = await Promise.all([
        prisma.gameResult.count(),
        prisma.gameResult.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.gameResult.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        this.getActiveGames(),
        this.getPopularGames(),
        this.getGameRevenue(),
        this.getPlayerStats(),
        this.getMatchmakingStats()
      ]);

      return {
        totalGames,
        games30Days,
        games7Days,
        activeGames,
        popularGames,
        gameRevenue,
        playerStats,
        matchmakingStats,
        gameGrowth: this.calculateGrowthRate(games30Days, games7Days)
      };
    } catch (error) {
      console.error('❌ Error getting game analytics:', error);
      throw error;
    }
  }

  /**
   * Get transaction analytics
   */
  static async getTransactionAnalytics() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalTransactions,
        transactions30Days,
        transactions7Days,
        transactionTypes,
        transactionStatuses,
        averageAmount,
        peakHours,
        fraudMetrics
      ] = await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        this.getTransactionTypeDistribution(),
        this.getTransactionStatusDistribution(),
        prisma.transaction.aggregate({
          _avg: { amount: true }
        }),
        this.getPeakTransactionHours(),
        this.getFraudMetrics()
      ]);

      return {
        totalTransactions,
        transactions30Days,
        transactions7Days,
        transactionTypes,
        transactionStatuses,
        averageAmount: averageAmount._avg.amount || 0,
        peakHours,
        fraudMetrics,
        transactionGrowth: this.calculateGrowthRate(transactions30Days, transactions7Days)
      };
    } catch (error) {
      console.error('❌ Error getting transaction analytics:', error);
      throw error;
    }
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity() {
    try {
      const [recentUsers, recentTransactions, recentGames, recentAuditLogs] = await Promise.all([
        prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            isVerified: true
          }
        }),
        prisma.transaction.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                username: true
              }
            }
          }
        }),
        prisma.gameResult.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            gameType: true,
            winner: true,
            amount: true,
            createdAt: true,
            players: {
              select: {
                username: true
              }
            }
          }
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            resourceType: true,
            details: true,
            createdAt: true,
            admin: {
              select: {
                username: true
              }
            }
          }
        })
      ]);

      return {
        recentUsers,
        recentTransactions,
        recentGames,
        recentAuditLogs
      };
    } catch (error) {
      console.error('❌ Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Get top users
   */
  static async getTopUsers() {
    try {
      const [topSpenders, topWinners, topPlayers, topReferrers] = await Promise.all([
        prisma.user.findMany({
          take: 10,
          orderBy: { real_balance: 'desc' },
          select: {
            id: true,
            username: true,
            real_balance: true,
            virtual_balance: true,
            createdAt: true
          }
        }),
        prisma.gameResult.groupBy({
          by: ['winner'],
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        }),
        prisma.gameResult.groupBy({
          by: ['players'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        this.getTopReferrers()
      ]);

      return {
        topSpenders,
        topWinners,
        topPlayers,
        topReferrers
      };
    } catch (error) {
      console.error('❌ Error getting top users:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealthMetrics() {
    try {
      const [dbHealth, memoryUsage, cpuUsage, diskUsage, errorRate, responseTime] = await Promise.all([
        this.checkDatabaseHealth(),
        this.getMemoryUsage(),
        this.getCPUUsage(),
        this.getDiskUsage(),
        this.getErrorRate(),
        this.getAverageResponseTime()
      ]);

      return {
        dbHealth,
        memoryUsage,
        cpuUsage,
        diskUsage,
        errorRate,
        responseTime,
        overallHealth: this.calculateOverallHealth({
          dbHealth,
          memoryUsage,
          cpuUsage,
          diskUsage,
          errorRate,
          responseTime
        })
      };
    } catch (error) {
      console.error('❌ Error getting system health metrics:', error);
      throw error;
    }
  }

  // Helper methods
  static async calculateUserGrowth() {
    try {
      const now = new Date();
      const periods = [7, 14, 30, 90];
      const growth = {};

      for (const days of periods) {
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const previousStartDate = new Date(now.getTime() - (days * 2) * 24 * 60 * 60 * 1000);

        const [current, previous] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: startDate } } }),
          prisma.user.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } })
        ]);

        growth[`${days}Days`] = previous > 0 ? ((current - previous) / previous * 100).toFixed(2) : 0;
      }

      return growth;
    } catch (error) {
      console.error('❌ Error calculating user growth:', error);
      return {};
    }
  }

  static async calculateUserRetention() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [newUsers30Days, activeUsers30Days, newUsers60Days, activeUsers60Days] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({ 
          where: { 
            createdAt: { gte: thirtyDaysAgo },
            gameResults: { some: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }
          } 
        }),
        prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo } } }),
        prisma.user.count({ 
          where: { 
            createdAt: { gte: sixtyDaysAgo },
            gameResults: { some: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }
          } 
        })
      ]);

      return {
        '30Day': newUsers30Days > 0 ? (activeUsers30Days / newUsers30Days * 100).toFixed(2) : 0,
        '60Day': newUsers60Days > 0 ? (activeUsers60Days / newUsers60Days * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error calculating user retention:', error);
      return {};
    }
  }

  static async getTopCountries() {
    try {
      // This would require adding a country field to the User model
      // For now, return mock data
      return [
        { country: 'United States', users: 1500, percentage: 45.2 },
        { country: 'United Kingdom', users: 800, percentage: 24.1 },
        { country: 'Canada', users: 450, percentage: 13.6 },
        { country: 'Australia', users: 320, percentage: 9.7 },
        { country: 'Germany', users: 250, percentage: 7.4 }
      ];
    } catch (error) {
      console.error('❌ Error getting top countries:', error);
      return [];
    }
  }

  static async calculateUserEngagement() {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [totalUsers, activeUsers, totalGames, totalTransactions] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            OR: [
              { gameResults: { some: { createdAt: { gte: sevenDaysAgo } } } },
              { transactions: { some: { createdAt: { gte: sevenDaysAgo } } } }
            ]
          }
        }),
        prisma.gameResult.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } })
      ]);

      return {
        activeUsers,
        totalUsers,
        engagementRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0,
        gamesPerUser: activeUsers > 0 ? (totalGames / activeUsers).toFixed(2) : 0,
        transactionsPerUser: activeUsers > 0 ? (totalTransactions / activeUsers).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error calculating user engagement:', error);
      return {};
    }
  }

  static async calculateRevenue(since) {
    try {
      const result = await prisma.transaction.aggregate({
        where: {
          createdAt: { gte: since },
          type: 'DEPOSIT',
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      });

      return result._sum.amount || 0;
    } catch (error) {
      console.error('❌ Error calculating revenue:', error);
      return 0;
    }
  }

  static async getTopSpenders() {
    try {
      return await prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED'
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      });
    } catch (error) {
      console.error('❌ Error getting top spenders:', error);
      return [];
    }
  }

  static async getCommissionStats() {
    try {
      const [totalCommission, commission30Days, commission7Days] = await Promise.all([
        prisma.commissionEarning.aggregate({
          _sum: { amount: true }
        }),
        prisma.commissionEarning.aggregate({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          _sum: { amount: true }
        }),
        prisma.commissionEarning.aggregate({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          _sum: { amount: true }
        })
      ]);

      return {
        totalCommission: totalCommission._sum.amount || 0,
        commission30Days: commission30Days._sum.amount || 0,
        commission7Days: commission7Days._sum.amount || 0
      };
    } catch (error) {
      console.error('❌ Error getting commission stats:', error);
      return {};
    }
  }

  static async getActiveGames() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      return await prisma.gameResult.count({
        where: { createdAt: { gte: oneHourAgo } }
      });
    } catch (error) {
      console.error('❌ Error getting active games:', error);
      return 0;
    }
  }

  static async getPopularGames() {
    try {
      return await prisma.gameResult.groupBy({
        by: ['gameType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      });
    } catch (error) {
      console.error('❌ Error getting popular games:', error);
      return [];
    }
  }

  static async getGameRevenue() {
    try {
      const result = await prisma.gameResult.aggregate({
        _sum: { amount: true }
      });

      return result._sum.amount || 0;
    } catch (error) {
      console.error('❌ Error getting game revenue:', error);
      return 0;
    }
  }

  static async getPlayerStats() {
    try {
      const [totalPlayers, activePlayers, averageGamesPerPlayer] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            gameResults: { some: {} }
          }
        }),
        prisma.gameResult.aggregate({
          _avg: { id: true }
        })
      ]);

      return {
        totalPlayers,
        activePlayers,
        averageGamesPerPlayer: averageGamesPerPlayer._avg.id || 0
      };
    } catch (error) {
      console.error('❌ Error getting player stats:', error);
      return {};
    }
  }

  static async getMatchmakingStats() {
    try {
      // This would require a matchmaking table
      // For now, return mock data
      return {
        totalMatches: 1250,
        averageWaitTime: 45,
        successRate: 92.5,
        activeQueues: 3
      };
    } catch (error) {
      console.error('❌ Error getting matchmaking stats:', error);
      return {};
    }
  }

  static async getTransactionTypeDistribution() {
    try {
      return await prisma.transaction.groupBy({
        by: ['type'],
        _count: { id: true }
      });
    } catch (error) {
      console.error('❌ Error getting transaction type distribution:', error);
      return [];
    }
  }

  static async getTransactionStatusDistribution() {
    try {
      return await prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true }
      });
    } catch (error) {
      console.error('❌ Error getting transaction status distribution:', error);
      return [];
    }
  }

  static async getPeakTransactionHours() {
    try {
      // This would require more complex time-based aggregation
      // For now, return mock data
      return [
        { hour: 14, count: 45 },
        { hour: 15, count: 52 },
        { hour: 16, count: 48 },
        { hour: 17, count: 61 },
        { hour: 18, count: 55 }
      ];
    } catch (error) {
      console.error('❌ Error getting peak transaction hours:', error);
      return [];
    }
  }

  static async getFraudMetrics() {
    try {
      const [totalTransactions, flaggedTransactions, blockedTransactions] = await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({ where: { status: 'FLAGGED' } }),
        prisma.transaction.count({ where: { status: 'BLOCKED' } })
      ]);

      return {
        totalTransactions,
        flaggedTransactions,
        blockedTransactions,
        fraudRate: totalTransactions > 0 ? (flaggedTransactions / totalTransactions * 100).toFixed(2) : 0,
        blockRate: totalTransactions > 0 ? (blockedTransactions / totalTransactions * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error getting fraud metrics:', error);
      return {};
    }
  }

  static async getTopReferrers() {
    try {
      // This would require a referral system
      // For now, return mock data
      return [
        { username: 'user1', referrals: 25, commission: 125.50 },
        { username: 'user2', referrals: 18, commission: 89.25 },
        { username: 'user3', referrals: 15, commission: 67.80 }
      ];
    } catch (error) {
      console.error('❌ Error getting top referrers:', error);
      return [];
    }
  }

  static async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        connections: 10, // Mock data
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: null
      };
    }
  }

  static async getMemoryUsage() {
    try {
      const usage = process.memoryUsage();
      return {
        used: Math.round(usage.heapUsed / 1024 / 1024),
        total: Math.round(usage.heapTotal / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
      };
    } catch (error) {
      console.error('❌ Error getting memory usage:', error);
      return {};
    }
  }

  static async getCPUUsage() {
    try {
      // This would require a more sophisticated CPU monitoring
      // For now, return mock data
      return {
        usage: 45.2,
        cores: 4,
        load: [1.2, 1.5, 1.8]
      };
    } catch (error) {
      console.error('❌ Error getting CPU usage:', error);
      return {};
    }
  }

  static async getDiskUsage() {
    try {
      // This would require file system monitoring
      // For now, return mock data
      return {
        used: 45.2,
        total: 100,
        percentage: 45.2,
        free: 54.8
      };
    } catch (error) {
      console.error('❌ Error getting disk usage:', error);
      return {};
    }
  }

  static async getErrorRate() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [totalRequests, errorRequests] = await Promise.all([
        prisma.auditLog.count({ where: { createdAt: { gte: oneHourAgo } } }),
        prisma.auditLog.count({ 
          where: { 
            createdAt: { gte: oneHourAgo },
            success: false
          } 
        })
      ]);

      return {
        totalRequests,
        errorRequests,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error getting error rate:', error);
      return {};
    }
  }

  static async getAverageResponseTime() {
    try {
      // This would require response time tracking
      // For now, return mock data
      return {
        average: 245,
        p95: 450,
        p99: 890,
        min: 120,
        max: 1200
      };
    } catch (error) {
      console.error('❌ Error getting average response time:', error);
      return {};
    }
  }

  static calculateOverallHealth(metrics) {
    try {
      let score = 100;

      // Database health
      if (metrics.dbHealth.status === 'unhealthy') score -= 30;
      if (metrics.dbHealth.responseTime > 1000) score -= 10;

      // Memory usage
      if (metrics.memoryUsage.percentage > 90) score -= 20;
      else if (metrics.memoryUsage.percentage > 80) score -= 10;

      // CPU usage
      if (metrics.cpuUsage.usage > 90) score -= 20;
      else if (metrics.cpuUsage.usage > 80) score -= 10;

      // Disk usage
      if (metrics.diskUsage.percentage > 90) score -= 15;
      else if (metrics.diskUsage.percentage > 80) score -= 5;

      // Error rate
      if (metrics.errorRate.errorRate > 10) score -= 25;
      else if (metrics.errorRate.errorRate > 5) score -= 15;

      // Response time
      if (metrics.responseTime.average > 1000) score -= 10;
      else if (metrics.responseTime.average > 500) score -= 5;

      return Math.max(0, score);
    } catch (error) {
      console.error('❌ Error calculating overall health:', error);
      return 0;
    }
  }

  static calculateGrowthRate(current, previous) {
    try {
      return previous > 0 ? ((current - previous) / previous * 100).toFixed(2) : 0;
    } catch (error) {
      console.error('❌ Error calculating growth rate:', error);
      return 0;
    }
  }
}

module.exports = AnalyticsService;

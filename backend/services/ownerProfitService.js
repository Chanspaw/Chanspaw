const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class OwnerProfitService {
  // Calculate platform profits from game results
  async calculatePlatformProfits(startDate, endDate) {
    try {
      const gameResults = await prisma.gameResult.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          matchType: 'real' // Only real money games
        },
        select: {
          gameType: true,
          betAmount: true,
          winAmount: true,
          createdAt: true
        }
      });

      const profitsByGame = {};
      
      gameResults.forEach(result => {
        if (!profitsByGame[result.gameType]) {
          profitsByGame[result.gameType] = {
            totalBets: 0,
            totalWins: 0,
            profit: 0
          };
        }
        
        profitsByGame[result.gameType].totalBets += result.betAmount;
        profitsByGame[result.gameType].totalWins += result.winAmount;
      });

      // Calculate profits (house edge)
      Object.keys(profitsByGame).forEach(gameType => {
        const game = profitsByGame[gameType];
        game.profit = game.totalBets - game.totalWins;
      });

      return profitsByGame;
    } catch (error) {
      console.error('Error calculating platform profits:', error);
      throw error;
    }
  }

  // Record platform profits
  async recordPlatformProfit(profitData) {
    try {
      const profit = await prisma.platformProfit.create({
        data: {
          gameType: profitData.gameType,
          totalBets: profitData.totalBets,
          totalWins: profitData.totalWins,
          houseEdge: profitData.houseEdge || 0,
          profit: profitData.profit,
          source: profitData.source || 'game_commission',
          metadata: profitData.metadata ? JSON.stringify(profitData.metadata) : null
        }
      });

      return profit;
    } catch (error) {
      console.error('Error recording platform profit:', error);
      throw error;
    }
  }

  // Get total available profits
  async getTotalAvailableProfits() {
    try {
      const totalProfits = await prisma.platformProfit.aggregate({
        _sum: {
          profit: true
        }
      });

      const totalWithdrawals = await prisma.ownerWithdrawal.aggregate({
        where: {
          status: {
            in: ['COMPLETED', 'PROCESSING']
          }
        },
        _sum: {
          amount: true
        }
      });

      const availableProfits = (totalProfits._sum.profit || 0) - (totalWithdrawals._sum.amount || 0);
      
      return {
        totalProfits: totalProfits._sum.profit || 0,
        totalWithdrawn: totalWithdrawals._sum.amount || 0,
        availableProfits: Math.max(0, availableProfits)
      };
    } catch (error) {
      console.error('Error getting total available profits:', error);
      throw error;
    }
  }

  // Create owner withdrawal request
  async createOwnerWithdrawal(withdrawalData) {
    try {
      const { amount, method, accountDetails, notes } = withdrawalData;

      // Check if amount is available
      const availableProfits = await this.getTotalAvailableProfits();
      
      if (amount > availableProfits.availableProfits) {
        throw new Error('Insufficient available profits for withdrawal');
      }

      if (amount <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
      }

      const withdrawal = await prisma.ownerWithdrawal.create({
        data: {
          amount,
          method,
          accountDetails: accountDetails ? JSON.stringify(accountDetails) : null,
          notes,
          status: 'PENDING'
        }
      });

      return withdrawal;
    } catch (error) {
      console.error('Error creating owner withdrawal:', error);
      throw error;
    }
  }

  // Get all owner withdrawals
  async getOwnerWithdrawals(filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 20 } = filters;
      
      const where = {};
      
      if (status) {
        where.status = status;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [withdrawals, total] = await Promise.all([
        prisma.ownerWithdrawal.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            processedByUser: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }),
        prisma.ownerWithdrawal.count({ where })
      ]);

      return {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting owner withdrawals:', error);
      throw error;
    }
  }

  // Process owner withdrawal (approve/reject)
  async processOwnerWithdrawal(withdrawalId, action, adminId, reason = null) {
    try {
      const withdrawal = await prisma.ownerWithdrawal.findUnique({
        where: { id: withdrawalId }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'PENDING') {
        throw new Error('Withdrawal is not in pending status');
      }

      let newStatus;
      switch (action) {
        case 'approve':
          newStatus = 'APPROVED';
          break;
        case 'reject':
          newStatus = 'REJECTED';
          break;
        default:
          throw new Error('Invalid action');
      }

      const updatedWithdrawal = await prisma.ownerWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: newStatus,
          processedBy: adminId,
          processedAt: new Date(),
          reason: action === 'reject' ? reason : null
        }
      });

      return updatedWithdrawal;
    } catch (error) {
      console.error('Error processing owner withdrawal:', error);
      throw error;
    }
  }

  // Get profit statistics
  async getProfitStatistics(timeRange = '30d') {
    try {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [profits, withdrawals] = await Promise.all([
        prisma.platformProfit.findMany({
          where: {
            createdAt: {
              gte: startDate
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.ownerWithdrawal.findMany({
          where: {
            createdAt: {
              gte: startDate
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const totalProfits = profits.reduce((sum, p) => sum + p.profit, 0);
      const totalWithdrawals = withdrawals
        .filter(w => w.status === 'COMPLETED')
        .reduce((sum, w) => sum + w.amount, 0);

      const profitByGame = {};
      profits.forEach(profit => {
        if (!profitByGame[profit.gameType]) {
          profitByGame[profit.gameType] = 0;
        }
        profitByGame[profit.gameType] += profit.profit;
      });

      return {
        totalProfits,
        totalWithdrawals,
        netProfit: totalProfits - totalWithdrawals,
        profitByGame,
        profitHistory: profits,
        withdrawalHistory: withdrawals
      };
    } catch (error) {
      console.error('Error getting profit statistics:', error);
      throw error;
    }
  }

  // Mark withdrawal as completed
  async completeWithdrawal(withdrawalId, adminId) {
    try {
      const withdrawal = await prisma.ownerWithdrawal.findUnique({
        where: { id: withdrawalId }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'APPROVED') {
        throw new Error('Withdrawal must be approved before completion');
      }

      const updatedWithdrawal = await prisma.ownerWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          processedBy: adminId,
          processedAt: new Date()
        }
      });

      return updatedWithdrawal;
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      throw error;
    }
  }
}

module.exports = new OwnerProfitService(); 
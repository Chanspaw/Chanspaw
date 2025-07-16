const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class OwnerProfitService {
  // Calculate platform profits from PlatformRevenue
  async calculatePlatformProfits(startDate, endDate) {
    try {
      const revenue = await prisma.platformRevenue.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          },
          currency: 'real'
        },
        select: {
          gameType: true,
          platformCut: true,
          amount: true,
          timestamp: true
        }
      });
      const profitsByGame = {};
      revenue.forEach(r => {
        if (!profitsByGame[r.gameType]) {
          profitsByGame[r.gameType] = {
            totalRevenue: 0,
            totalPlatformCut: 0
          };
        }
        profitsByGame[r.gameType].totalRevenue += r.amount;
        profitsByGame[r.gameType].totalPlatformCut += r.platformCut;
      });
      return profitsByGame;
    } catch (error) {
      console.error('Error calculating platform profits:', error);
      throw error;
    }
  }

  // Get total available profits (sum of all platformCut in PlatformRevenue minus withdrawals)
  async getTotalAvailableProfits() {
    try {
      const totalProfits = await prisma.platformRevenue.aggregate({
        _sum: { platformCut: true },
        where: { currency: 'real' }
      });
      const totalWithdrawals = await prisma.ownerWithdrawal.aggregate({
        where: {
          status: { in: ['COMPLETED', 'PROCESSING'] }
        },
        _sum: { amount: true }
      });
      const availableProfits = (totalProfits._sum.platformCut || 0) - (totalWithdrawals._sum.amount || 0);
      return {
        totalProfits: totalProfits._sum.platformCut || 0,
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
      if (status) where.status = status;
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
              select: { id: true, username: true, email: true }
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
      const withdrawal = await prisma.ownerWithdrawal.findUnique({ where: { id: withdrawalId } });
      if (!withdrawal) throw new Error('Withdrawal not found');
      if (withdrawal.status !== 'PENDING') throw new Error('Withdrawal is not in pending status');
      let newStatus;
      switch (action) {
        case 'approve': newStatus = 'APPROVED'; break;
        case 'reject': newStatus = 'REJECTED'; break;
        default: throw new Error('Invalid action');
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

  // List all platform profit history from PlatformRevenue
  async getPlatformProfitHistory({ currency = 'real', startDate, endDate, page = 1, limit = 50 } = {}) {
    try {
      const where = { currency };
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      const skip = (page - 1) * limit;
      const [history, total] = await Promise.all([
        prisma.platformRevenue.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit
        }),
        prisma.platformRevenue.count({ where })
      ]);
      return {
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting platform profit history:', error);
      throw error;
    }
  }

  // Get current owner wallet balance
  async getOwnerWalletBalance() {
    try {
      const owner = await prisma.user.findFirst({ where: { isOwner: true }, select: { id: true, username: true, real_balance: true } });
      if (!owner) return { real_balance: 0 };
      return { real_balance: owner.real_balance };
    } catch (error) {
      console.error('Error getting owner wallet balance:', error);
      throw error;
    }
  }
}

module.exports = new OwnerProfitService(); 
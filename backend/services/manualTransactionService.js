const { PrismaClient } = require('@prisma/client');
const auditService = require('./auditService');

const prisma = new PrismaClient();

class ManualTransactionService {
  /**
   * Create manual transaction
   * @param {Object} params
   * @param {string} params.userId - Target user ID
   * @param {string} params.type - Transaction type
   * @param {number} params.amount - Transaction amount
   * @param {string} params.description - Transaction description
   * @param {string} params.adminId - Admin creating the transaction
   * @param {string} params.reason - Reason for manual transaction
   * @param {Object} params.metadata - Additional metadata
   * @param {string} params.ip - Admin IP address
   * @param {string} params.userAgent - Admin user agent
   */
  static async createManualTransaction({
    userId,
    type,
    amount,
    description,
    adminId,
    reason,
    metadata = {},
    ip,
    userAgent
  }) {
    try {
      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          real_balance: true,
          virtual_balance: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Determine if this affects real or virtual balance
      const isRealMoney = ['deposit', 'withdrawal', 'refund', 'penalty', 'bonus'].includes(type);
      const balanceField = isRealMoney ? 'real_balance' : 'virtual_balance';
      const currentBalance = user[balanceField];

      // Calculate new balance based on transaction type
      let newBalance = currentBalance;
      let transactionAmount = amount;

      switch (type) {
        case 'deposit':
        case 'bonus':
        case 'refund':
          newBalance += amount;
          break;
        case 'withdrawal':
        case 'penalty':
        case 'fee':
          newBalance = Math.max(0, newBalance - amount);
          transactionAmount = -amount;
          break;
        case 'adjustment':
          newBalance += amount; // Can be positive or negative
          break;
        default:
          throw new Error(`Invalid transaction type: ${type}`);
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          type: `manual_${type}`,
          amount: transactionAmount,
          status: 'completed',
          description: `Manual ${type}: ${description}`,
          metadata: JSON.stringify({
            adminId,
            reason,
            previousBalance: currentBalance,
            newBalance,
            ...metadata
          })
        }
      });

      // Update user balance
      await prisma.user.update({
        where: { id: userId },
        data: { [balanceField]: newBalance }
      });

      // Log audit
      await auditService.logAction({
        adminId,
        action: 'manual_transaction_created',
        resourceType: 'transaction',
        resourceId: transaction.id,
        userId,
        details: {
          type,
          amount: transactionAmount,
          description,
          reason,
          previousBalance: currentBalance,
          newBalance,
          balanceField
        },
        ip,
        userAgent,
        success: true
      });

      return {
        success: true,
        transaction: {
          ...transaction,
          metadata: JSON.parse(transaction.metadata)
        },
        user: {
          ...user,
          [balanceField]: newBalance
        }
      };

    } catch (error) {
      console.error('Failed to create manual transaction:', error);
      
      // Log failed audit
      await auditService.logAction({
        adminId,
        action: 'manual_transaction_failed',
        resourceType: 'transaction',
        resourceId: null,
        userId,
        details: {
          type,
          amount,
          description,
          reason,
          error: error.message
        },
        ip,
        userAgent,
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Get manual transaction statistics
   * @param {Object} filters - Filter parameters
   */
  static async getManualTransactionStats(filters = {}) {
    try {
      const where = {
        type: {
          startsWith: 'manual_'
        }
      };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      if (filters.type) {
        where.type = `manual_${filters.type}`;
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.skip || 0
        }),
        prisma.transaction.count({ where })
      ]);

      // Calculate statistics
      const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const depositAmount = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      const withdrawalAmount = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            limit: filters.limit || 50,
            skip: filters.skip || 0,
            pages: Math.ceil(total / (filters.limit || 50))
          },
          stats: {
            totalTransactions: total,
            totalAmount,
            depositAmount,
            withdrawalAmount,
            averageAmount: total > 0 ? totalAmount / total : 0
          }
        }
      };

    } catch (error) {
      console.error('Failed to get manual transaction stats:', error);
      throw error;
    }
  }

  /**
   * Validate transaction parameters
   * @param {Object} params - Transaction parameters
   */
  static validateTransactionParams(params) {
    const errors = [];

    if (!params.userId) errors.push('User ID is required');
    if (!params.type) errors.push('Transaction type is required');
    if (typeof params.amount !== 'number' || params.amount <= 0) {
      errors.push('Amount must be a positive number');
    }
    if (!params.description) errors.push('Description is required');
    if (!params.adminId) errors.push('Admin ID is required');
    if (!params.reason) errors.push('Reason is required');

    const validTypes = ['deposit', 'withdrawal', 'refund', 'penalty', 'bonus', 'fee', 'adjustment'];
    if (!validTypes.includes(params.type)) {
      errors.push(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get approval workflow based on amount
   * @param {number} amount - Transaction amount
   */
  static getApprovalWorkflow(amount) {
    if (amount <= 100) {
      return { requiresApproval: false, level: 'none' };
    } else if (amount <= 1000) {
      return { requiresApproval: true, level: 'supervisor' };
    } else if (amount <= 10000) {
      return { requiresApproval: true, level: 'manager' };
    } else {
      return { requiresApproval: true, level: 'admin' };
    }
  }
}

module.exports = ManualTransactionService; 
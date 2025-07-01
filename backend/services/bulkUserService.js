const { PrismaClient } = require('@prisma/client');
const auditService = require('./auditService');

const prisma = new PrismaClient();

class BulkUserService {
  /**
   * Bulk update user status
   * @param {Object} params
   * @param {string[]} params.userIds - Array of user IDs
   * @param {string} params.action - Action to perform (ban, suspend, activate, verify)
   * @param {string} params.adminId - Admin performing the action
   * @param {string} params.reason - Reason for the action
   * @param {string} params.ip - Admin IP address
   * @param {string} params.userAgent - Admin user agent
   */
  static async bulkUpdateUserStatus({
    userIds,
    action,
    adminId,
    reason,
    ip,
    userAgent
  }) {
    const results = {
      success: [],
      failed: [],
      total: userIds.length
    };

    for (const userId of userIds) {
      try {
        let updateData = {};
        let auditAction = '';

        switch (action) {
          case 'ban':
            updateData = { isActive: false };
            auditAction = 'user_banned';
            break;
          case 'suspend':
            updateData = { isActive: false };
            auditAction = 'user_suspended';
            break;
          case 'activate':
            updateData = { isActive: true };
            auditAction = 'user_activated';
            break;
          case 'verify':
            updateData = { isVerified: true };
            auditAction = 'user_verified';
            break;
          case 'unverify':
            updateData = { isVerified: false };
            auditAction = 'user_unverified';
            break;
          default:
            throw new Error(`Invalid action: ${action}`);
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: updateData
        });

        // Log audit
        await auditService.logAction({
          adminId,
          action: auditAction,
          resourceType: 'user',
          resourceId: userId,
          userId,
          details: {
            action,
            reason,
            previousStatus: action === 'ban' || action === 'suspend' ? 'active' : 'inactive',
            newStatus: action === 'ban' || action === 'suspend' ? 'inactive' : 'active'
          },
          ip,
          userAgent,
          success: true
        });

        results.success.push({
          userId,
          username: user.username,
          email: user.email,
          action
        });

      } catch (error) {
        console.error(`❌ Failed to ${action} user ${userId}:`, error);
        
        // Log failed audit
        await auditService.logAction({
          adminId,
          action: `user_${action}_failed`,
          resourceType: 'user',
          resourceId: userId,
          userId,
          details: { action, reason, error: error.message },
          ip,
          userAgent,
          success: false,
          errorMessage: error.message
        });

        results.failed.push({
          userId,
          action,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Bulk update user balances
   * @param {Object} params
   * @param {string[]} params.userIds - Array of user IDs
   * @param {string} params.balanceType - 'real' or 'virtual'
   * @param {number} params.amount - Amount to add/subtract
   * @param {string} params.operation - 'add' or 'subtract'
   * @param {string} params.adminId - Admin performing the action
   * @param {string} params.reason - Reason for the action
   * @param {string} params.ip - Admin IP address
   * @param {string} params.userAgent - Admin user agent
   */
  static async bulkUpdateUserBalances({
    userIds,
    balanceType,
    amount,
    operation,
    adminId,
    reason,
    ip,
    userAgent
  }) {
    const results = {
      success: [],
      failed: [],
      total: userIds.length
    };

    for (const userId of userIds) {
      try {
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

        const balanceField = balanceType === 'real' ? 'real_balance' : 'virtual_balance';
        const currentBalance = user[balanceField];
        const newBalance = operation === 'add' 
          ? currentBalance + amount 
          : Math.max(0, currentBalance - amount);

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { [balanceField]: newBalance }
        });

        // Create transaction record
        await prisma.transaction.create({
          data: {
            userId,
            type: `admin_${operation}_${balanceType}`,
            amount: operation === 'add' ? amount : -amount,
            status: 'completed',
            description: `Admin ${operation}: ${reason}`,
            metadata: JSON.stringify({
              adminId,
              reason,
              previousBalance: currentBalance,
              newBalance
            })
          }
        });

        // Log audit
        await auditService.logAction({
          adminId,
          action: `bulk_balance_${operation}`,
          resourceType: 'user',
          resourceId: userId,
          userId,
          details: {
            balanceType,
            amount,
            operation,
            reason,
            previousBalance: currentBalance,
            newBalance
          },
          ip,
          userAgent,
          success: true
        });

        results.success.push({
          userId,
          username: user.username,
          email: user.email,
          balanceType,
          operation,
          amount,
          previousBalance: currentBalance,
          newBalance
        });

      } catch (error) {
        console.error(`❌ Failed to update balance for user ${userId}:`, error);
        
        await auditService.logAction({
          adminId,
          action: `bulk_balance_${operation}_failed`,
          resourceType: 'user',
          resourceId: userId,
          userId,
          details: {
            balanceType,
            amount,
            operation,
            reason,
            error: error.message
          },
          ip,
          userAgent,
          success: false,
          errorMessage: error.message
        });

        results.failed.push({
          userId,
          balanceType,
          operation,
          amount,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Bulk delete users
   * @param {Object} params
   * @param {string[]} params.userIds - Array of user IDs
   * @param {string} params.adminId - Admin performing the action
   * @param {string} params.reason - Reason for deletion
   * @param {string} params.ip - Admin IP address
   * @param {string} params.userAgent - Admin user agent
   */
  static async bulkDeleteUsers({
    userIds,
    adminId,
    reason,
    ip,
    userAgent
  }) {
    const results = {
      success: [],
      failed: [],
      total: userIds.length
    };

    for (const userId of userIds) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            email: true
          }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Log audit before deletion
        await auditService.logAction({
          adminId,
          action: 'user_deleted',
          resourceType: 'user',
          resourceId: userId,
          userId,
          details: {
            reason,
            username: user.username,
            email: user.email
          },
          ip,
          userAgent,
          success: true
        });

        // Delete user (cascade will handle related records)
        await prisma.user.delete({
          where: { id: userId }
        });

        results.success.push({
          userId,
          username: user.username,
          email: user.email
        });

      } catch (error) {
        console.error(`❌ Failed to delete user ${userId}:`, error);
        
        await auditService.logAction({
          adminId,
          action: 'user_delete_failed',
          resourceType: 'user',
          resourceId: userId,
          userId,
          details: {
            reason,
            error: error.message
          },
          ip,
          userAgent,
          success: false,
          errorMessage: error.message
        });

        results.failed.push({
          userId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Bulk export user data
   * @param {Object} params
   * @param {string[]} params.userIds - Array of user IDs
   * @param {string[]} params.fields - Fields to export
   */
  static async bulkExportUserData({ userIds, fields = ['id', 'username', 'email', 'isActive', 'isVerified', 'real_balance', 'virtual_balance', 'createdAt'] }) {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds }
        },
        select: fields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {})
      });

      return {
        success: true,
        data: users,
        total: users.length,
        fields
      };
    } catch (error) {
      console.error('❌ Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Get bulk operation statistics
   * @param {string} adminId - Admin ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  static async getBulkOperationStats(adminId, startDate = null, endDate = null) {
    try {
      const where = {
        adminId,
        action: {
          startsWith: 'bulk_'
        }
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      const stats = {
        totalOperations: logs.length,
        successfulOperations: logs.filter(log => log.success).length,
        failedOperations: logs.filter(log => !log.success).length,
        operationsByType: {},
        recentOperations: logs.slice(0, 10)
      };

      // Group by operation type
      logs.forEach(log => {
        const action = log.action;
        if (!stats.operationsByType[action]) {
          stats.operationsByType[action] = {
            total: 0,
            successful: 0,
            failed: 0
          };
        }
        stats.operationsByType[action].total++;
        if (log.success) {
          stats.operationsByType[action].successful++;
        } else {
          stats.operationsByType[action].failed++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get bulk operation stats:', error);
      throw error;
    }
  }
}

module.exports = new BulkUserService(); 
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AuditService {
  /**
   * Log an admin action
   * @param {Object} params
   * @param {string} params.adminId - ID of the admin performing the action
   * @param {string} params.action - Action being performed
   * @param {string} params.resourceType - Type of resource being affected
   * @param {string} params.resourceId - ID of the resource being affected
   * @param {string} params.userId - Target user ID (if applicable)
   * @param {Object} params.details - Detailed information about the action
   * @param {string} params.ip - IP address of the admin
   * @param {string} params.userAgent - User agent string
   * @param {boolean} params.success - Whether the action was successful
   * @param {string} params.errorMessage - Error message if action failed
   * @param {Object} params.metadata - Additional metadata
   */
  static async logAction({
    adminId,
    action,
    resourceType,
    resourceId,
    userId,
    details,
    ip,
    userAgent,
    success = true,
    errorMessage = null,
    metadata = {}
  }) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action,
          resourceType,
          resourceId,
          userId,
          details: details ? JSON.stringify(details) : null,
          ip,
          userAgent,
          success,
          errorMessage,
          metadata: JSON.stringify(metadata)
        }
      });

      console.log(`🔍 Audit Log: ${action} by admin ${adminId} - ${success ? 'SUCCESS' : 'FAILED'}`);
      return auditLog;
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Get audit logs with filtering
   * @param {Object} filters
   * @param {string} filters.adminId - Filter by admin ID
   * @param {string} filters.userId - Filter by target user ID
   * @param {string} filters.action - Filter by action type
   * @param {string} filters.resourceType - Filter by resource type
   * @param {Date} filters.startDate - Start date for filtering
   * @param {Date} filters.endDate - End date for filtering
   * @param {boolean} filters.success - Filter by success status
   * @param {number} filters.limit - Number of records to return
   * @param {number} filters.offset - Number of records to skip
   */
  static async getAuditLogs(filters = {}) {
    const {
      adminId,
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      success,
      limit = 50,
      offset = 0
    } = filters;

    const where = {};

    if (adminId) where.adminId = adminId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (success !== undefined) where.success = success;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    try {
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            admin: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            targetUser: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.auditLog.count({ where })
      ]);

      return {
        logs: logs.map(log => ({
          ...log,
          details: log.details ? JSON.parse(log.details) : null,
          metadata: log.metadata ? JSON.parse(log.metadata) : null
        })),
        total,
        hasMore: total > offset + limit
      };
    } catch (error) {
      console.error('❌ Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats() {
    try {
      const [
        totalLogs,
        todayLogs,
        failedLogs,
        topActions,
        topAdmins
      ] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.auditLog.count({
          where: { success: false }
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10
        }),
        prisma.auditLog.groupBy({
          by: ['adminId'],
          _count: { adminId: true },
          orderBy: { _count: { adminId: 'desc' } },
          take: 10
        })
      ]);

      return {
        totalLogs,
        todayLogs,
        failedLogs,
        successRate: totalLogs > 0 ? ((totalLogs - failedLogs) / totalLogs * 100).toFixed(2) : 0,
        topActions,
        topAdmins
      };
    } catch (error) {
      console.error('❌ Failed to get audit stats:', error);
      throw error;
    }
  }

  /**
   * Export audit logs to CSV
   */
  static async exportAuditLogs(filters = {}) {
    const logs = await this.getAuditLogs({ ...filters, limit: 10000 });
    
    const csvHeaders = [
      'ID',
      'Admin',
      'Action',
      'Resource Type',
      'Resource ID',
      'Target User',
      'IP Address',
      'Success',
      'Error Message',
      'Created At'
    ];

    const csvRows = logs.logs.map(log => [
      log.id,
      log.admin?.username || 'System',
      log.action,
      log.resourceType || '',
      log.resourceId || '',
      log.targetUser?.username || '',
      log.ip || '',
      log.success ? 'Yes' : 'No',
      log.errorMessage || '',
      log.createdAt.toISOString()
    ]);

    return {
      headers: csvHeaders,
      rows: csvRows
    };
  }
}

module.exports = AuditService; 
const { PrismaClient } = require('@prisma/client');
const AuditService = require('./auditService');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

class ExportService {
  /**
   * Export users data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv', 'excel', 'json')
   * @param {string} requestedBy - Admin ID who requested the export
   */
  static async exportUsers(filters = {}, format = 'csv', requestedBy) {
    try {
      const {
        isVerified,
        isActive,
        isAdmin,
        registrationDate,
        hasBalance,
        minBalance,
        maxBalance,
        userRole,
        search
      } = filters;

      const where = {};

      if (isVerified !== undefined) where.isVerified = isVerified;
      if (isActive !== undefined) where.isActive = isActive;
      if (isAdmin !== undefined) where.isAdmin = isAdmin;
      if (userRole) where.roleId = userRole;

      if (registrationDate) {
        if (registrationDate.start) {
          where.createdAt = { gte: new Date(registrationDate.start) };
        }
        if (registrationDate.end) {
          where.createdAt = { ...where.createdAt, lte: new Date(registrationDate.end) };
        }
      }

      if (hasBalance) {
        where.OR = [
          { real_balance: { gt: 0 } },
          { virtual_balance: { gt: 0 } }
        ];
      }

      if (minBalance !== undefined) {
        where.real_balance = { gte: minBalance };
      }

      if (maxBalance !== undefined) {
        where.real_balance = { ...where.real_balance, lte: maxBalance };
      }

      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ];
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          role: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              gameResults: true,
              transactions: true,
              notifications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const exportData = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        dateOfBirth: user.dateOfBirth || '',
        realBalance: user.real_balance,
        virtualBalance: user.virtual_balance,
        role: user.role?.name || '',
        isVerified: user.isVerified,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        totalGames: user._count.gameResults,
        totalTransactions: user._count.transactions,
        totalNotifications: user._count.notifications
      }));

      const fileName = `users_export_${Date.now()}`;
      const filePath = await this.generateExportFile(exportData, fileName, format);

      // Log audit
      await AuditService.logAction({
        adminId: requestedBy,
        action: 'users_exported',
        resourceType: 'export',
        details: {
          format,
          recordCount: exportData.length,
          filters
        },
        success: true
      });

      return {
        filePath,
        fileName: `${fileName}.${format}`,
        recordCount: exportData.length,
        format
      };
    } catch (error) {
      console.error('❌ Error exporting users:', error);
      throw error;
    }
  }

  /**
   * Export transactions data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format
   * @param {string} requestedBy - Admin ID who requested the export
   */
  static async exportTransactions(filters = {}, format = 'csv', requestedBy) {
    try {
      const {
        type,
        status,
        minAmount,
        maxAmount,
        dateRange,
        userId
      } = filters;

      const where = {};

      if (type) where.type = type;
      if (status) where.status = status;
      if (userId) where.userId = userId;

      if (minAmount !== undefined) {
        where.amount = { gte: minAmount };
      }

      if (maxAmount !== undefined) {
        where.amount = { ...where.amount, lte: maxAmount };
      }

      if (dateRange) {
        if (dateRange.start) {
          where.createdAt = { gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
          where.createdAt = { ...where.createdAt, lte: new Date(dateRange.end) };
        }
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const exportData = transactions.map(transaction => ({
        id: transaction.id,
        userId: transaction.userId,
        username: transaction.user.username,
        email: transaction.user.email,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description || '',
        metadata: JSON.stringify(transaction.metadata || {}),
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }));

      const fileName = `transactions_export_${Date.now()}`;
      const filePath = await this.generateExportFile(exportData, fileName, format);

      // Log audit
      await AuditService.logAction({
        adminId: requestedBy,
        action: 'transactions_exported',
        resourceType: 'export',
        details: {
          format,
          recordCount: exportData.length,
          filters
        },
        success: true
      });

      return {
        filePath,
        fileName: `${fileName}.${format}`,
        recordCount: exportData.length,
        format
      };
    } catch (error) {
      console.error('❌ Error exporting transactions:', error);
      throw error;
    }
  }

  /**
   * Export game results data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format
   * @param {string} requestedBy - Admin ID who requested the export
   */
  static async exportGameResults(filters = {}, format = 'csv', requestedBy) {
    try {
      const {
        gameType,
        winner,
        minAmount,
        maxAmount,
        dateRange
      } = filters;

      const where = {};

      if (gameType) where.gameType = gameType;
      if (winner) where.winner = winner;

      if (minAmount !== undefined) {
        where.amount = { gte: minAmount };
      }

      if (maxAmount !== undefined) {
        where.amount = { ...where.amount, lte: maxAmount };
      }

      if (dateRange) {
        if (dateRange.start) {
          where.createdAt = { gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
          where.createdAt = { ...where.createdAt, lte: new Date(dateRange.end) };
        }
      }

      const gameResults = await prisma.gameResult.findMany({
        where,
        include: {
          players: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const exportData = gameResults.map(game => ({
        id: game.id,
        gameType: game.gameType,
        winner: game.winner,
        players: game.players.map(p => p.username).join(', '),
        amount: game.amount,
        metadata: JSON.stringify(game.metadata || {}),
        createdAt: game.createdAt
      }));

      const fileName = `game_results_export_${Date.now()}`;
      const filePath = await this.generateExportFile(exportData, fileName, format);

      // Log audit
      await AuditService.logAction({
        adminId: requestedBy,
        action: 'game_results_exported',
        resourceType: 'export',
        details: {
          format,
          recordCount: exportData.length,
          filters
        },
        success: true
      });

      return {
        filePath,
        fileName: `${fileName}.${format}`,
        recordCount: exportData.length,
        format
      };
    } catch (error) {
      console.error('❌ Error exporting game results:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   * @param {Object} filters - Export filters
   * @param {string} format - Export format
   * @param {string} requestedBy - Admin ID who requested the export
   */
  static async exportAuditLogs(filters = {}, format = 'csv', requestedBy) {
    try {
      const {
        action,
        resourceType,
        adminId,
        success,
        dateRange
      } = filters;

      const where = {};

      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (adminId) where.adminId = adminId;
      if (success !== undefined) where.success = success;

      if (dateRange) {
        if (dateRange.start) {
          where.createdAt = { gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
          where.createdAt = { ...where.createdAt, lte: new Date(dateRange.end) };
        }
      }

      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              username: true,
              email: true
            }
          },
          user: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const exportData = auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        adminUsername: log.admin?.username || '',
        adminEmail: log.admin?.email || '',
        userUsername: log.user?.username || '',
        userEmail: log.user?.email || '',
        details: JSON.stringify(log.details || {}),
        success: log.success,
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        createdAt: log.createdAt
      }));

      const fileName = `audit_logs_export_${Date.now()}`;
      const filePath = await this.generateExportFile(exportData, fileName, format);

      // Log audit
      await AuditService.logAction({
        adminId: requestedBy,
        action: 'audit_logs_exported',
        resourceType: 'export',
        details: {
          format,
          recordCount: exportData.length,
          filters
        },
        success: true
      });

      return {
        filePath,
        fileName: `${fileName}.${format}`,
        recordCount: exportData.length,
        format
      };
    } catch (error) {
      console.error('❌ Error exporting audit logs:', error);
      throw error;
    }
  }

  /**
   * Export comprehensive report
   * @param {Object} reportConfig - Report configuration
   * @param {string} requestedBy - Admin ID who requested the export
   */
  static async exportComprehensiveReport(reportConfig, requestedBy) {
    try {
      const {
        includeUsers = true,
        includeTransactions = true,
        includeGameResults = true,
        includeAuditLogs = true,
        includeAnalytics = true,
        dateRange,
        format = 'excel'
      } = reportConfig;

      const reportData = {};

      if (includeUsers) {
        const users = await prisma.user.findMany({
          include: {
            role: {
              select: { name: true }
            },
            _count: {
              select: {
                gameResults: true,
                transactions: true
              }
            }
          }
        });

        reportData.users = users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role?.name || '',
          realBalance: user.real_balance,
          virtualBalance: user.virtual_balance,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          totalGames: user._count.gameResults,
          totalTransactions: user._count.transactions
        }));
      }

      if (includeTransactions) {
        const where = {};
        if (dateRange) {
          if (dateRange.start) where.createdAt = { gte: new Date(dateRange.start) };
          if (dateRange.end) where.createdAt = { ...where.createdAt, lte: new Date(dateRange.end) };
        }

        const transactions = await prisma.transaction.findMany({
          where,
          include: {
            user: {
              select: { username: true }
            }
          }
        });

        reportData.transactions = transactions.map(t => ({
          id: t.id,
          username: t.user.username,
          amount: t.amount,
          type: t.type,
          status: t.status,
          createdAt: t.createdAt
        }));
      }

      if (includeGameResults) {
        const where = {};
        if (dateRange) {
          if (dateRange.start) where.createdAt = { gte: new Date(dateRange.start) };
          if (dateRange.end) where.createdAt = { ...where.createdAt, lte: new Date(dateRange.end) };
        }

        const gameResults = await prisma.gameResult.findMany({
          where,
          include: {
            players: {
              select: { username: true }
            }
          }
        });

        reportData.gameResults = gameResults.map(g => ({
          id: g.id,
          gameType: g.gameType,
          winner: g.winner,
          players: g.players.map(p => p.username).join(', '),
          amount: g.amount,
          createdAt: g.createdAt
        }));
      }

      if (includeAnalytics) {
        reportData.analytics = await this.generateAnalyticsSummary(dateRange);
      }

      const fileName = `comprehensive_report_${Date.now()}`;
      const filePath = await this.generateMultiSheetReport(reportData, fileName, format);

      // Log audit
      await AuditService.logAction({
        adminId: requestedBy,
        action: 'comprehensive_report_exported',
        resourceType: 'export',
        details: {
          format,
          sections: Object.keys(reportData),
          dateRange
        },
        success: true
      });

      return {
        filePath,
        fileName: `${fileName}.${format}`,
        sections: Object.keys(reportData),
        format
      };
    } catch (error) {
      console.error('❌ Error exporting comprehensive report:', error);
      throw error;
    }
  }

  /**
   * Generate analytics summary
   * @param {Object} dateRange - Date range for analytics
   */
  static async generateAnalyticsSummary(dateRange) {
    try {
      const where = {};
      if (dateRange) {
        if (dateRange.start) where.createdAt = { gte: new Date(dateRange.start) };
        if (dateRange.end) where.createdAt = { ...where.createdAt, lte: new Date(dateRange.end) };
      }

      const [
        totalUsers,
        newUsers,
        totalTransactions,
        totalRevenue,
        totalGames,
        activeUsers
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where }),
        prisma.transaction.count({ where }),
        prisma.transaction.aggregate({
          where: { ...where, type: 'DEPOSIT', status: 'COMPLETED' },
          _sum: { amount: true }
        }),
        prisma.gameResult.count({ where }),
        prisma.user.count({
          where: {
            ...where,
            gameResults: { some: {} }
          }
        })
      ]);

      return {
        totalUsers,
        newUsers,
        totalTransactions,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalGames,
        activeUsers,
        averageRevenuePerUser: totalUsers > 0 ? (totalRevenue._sum.amount || 0) / totalUsers : 0,
        averageGamesPerUser: totalUsers > 0 ? totalGames / totalUsers : 0
      };
    } catch (error) {
      console.error('❌ Error generating analytics summary:', error);
      return {};
    }
  }

  /**
   * Generate export file
   * @param {Array} data - Data to export
   * @param {string} fileName - File name
   * @param {string} format - Export format
   */
  static async generateExportFile(data, fileName, format) {
    try {
      const exportsDir = path.join(__dirname, '../exports');
      await fs.mkdir(exportsDir, { recursive: true });

      if (format === 'csv') {
        return await this.generateCSV(data, fileName, exportsDir);
      } else if (format === 'excel') {
        return await this.generateExcel(data, fileName, exportsDir);
      } else if (format === 'json') {
        return await this.generateJSON(data, fileName, exportsDir);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('❌ Error generating export file:', error);
      throw error;
    }
  }

  /**
   * Generate CSV file
   * @param {Array} data - Data to export
   * @param {string} fileName - File name
   * @param {string} exportsDir - Exports directory
   */
  static async generateCSV(data, fileName, exportsDir) {
    try {
      if (data.length === 0) {
        throw new Error('No data to export');
      }

      const headers = Object.keys(data[0]).map(key => ({
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      }));

      const csvWriter = csv({
        path: path.join(exportsDir, `${fileName}.csv`),
        header: headers
      });

      await csvWriter.writeRecords(data);
      return path.join(exportsDir, `${fileName}.csv`);
    } catch (error) {
      console.error('❌ Error generating CSV:', error);
      throw error;
    }
  }

  /**
   * Generate Excel file
   * @param {Array} data - Data to export
   * @param {string} fileName - File name
   * @param {string} exportsDir - Exports directory
   */
  static async generateExcel(data, fileName, exportsDir) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      if (data.length === 0) {
        throw new Error('No data to export');
      }

      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Add data
      data.forEach(row => {
        const values = headers.map(header => row[header]);
        worksheet.addRow(values);
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = Math.max(
          column.header.length,
          ...data.map(row => String(row[column.key]).length)
        ) + 2;
      });

      const filePath = path.join(exportsDir, `${fileName}.xlsx`);
      await workbook.xlsx.writeFile(filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating Excel:', error);
      throw error;
    }
  }

  /**
   * Generate JSON file
   * @param {Array} data - Data to export
   * @param {string} fileName - File name
   * @param {string} exportsDir - Exports directory
   */
  static async generateJSON(data, fileName, exportsDir) {
    try {
      const filePath = path.join(exportsDir, `${fileName}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return filePath;
    } catch (error) {
      console.error('❌ Error generating JSON:', error);
      throw error;
    }
  }

  /**
   * Generate multi-sheet report
   * @param {Object} reportData - Report data with multiple sheets
   * @param {string} fileName - File name
   * @param {string} format - Export format
   */
  static async generateMultiSheetReport(reportData, fileName, format) {
    try {
      if (format !== 'excel') {
        throw new Error('Multi-sheet reports are only supported in Excel format');
      }

      const workbook = new ExcelJS.Workbook();
      const exportsDir = path.join(__dirname, '../exports');
      await fs.mkdir(exportsDir, { recursive: true });

      // Add summary sheet
      if (reportData.analytics) {
        const summarySheet = workbook.addWorksheet('Summary');
        const analytics = reportData.analytics;
        
        summarySheet.addRow(['Metric', 'Value']);
        Object.entries(analytics).forEach(([key, value]) => {
          summarySheet.addRow([key, value]);
        });

        // Style summary sheet
        summarySheet.getRow(1).font = { bold: true };
        summarySheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }

      // Add data sheets
      Object.entries(reportData).forEach(([sheetName, data]) => {
        if (sheetName === 'analytics') return; // Skip analytics as it's in summary

        const worksheet = workbook.addWorksheet(sheetName.charAt(0).toUpperCase() + sheetName.slice(1));

        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          worksheet.addRow(headers);

          data.forEach(row => {
            const values = headers.map(header => row[header]);
            worksheet.addRow(values);
          });

          // Style headers
          worksheet.getRow(1).font = { bold: true };
          worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };

          // Auto-fit columns
          worksheet.columns.forEach(column => {
            column.width = Math.max(
              column.header.length,
              ...data.map(row => String(row[column.key]).length)
            ) + 2;
          });
        }
      });

      const filePath = path.join(exportsDir, `${fileName}.xlsx`);
      await workbook.xlsx.writeFile(filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating multi-sheet report:', error);
      throw error;
    }
  }

  /**
   * Get export history
   * @param {string} requestedBy - Admin ID
   */
  static async getExportHistory(requestedBy) {
    try {
      const exports = await prisma.auditLog.findMany({
        where: {
          adminId: requestedBy,
          action: {
            in: ['users_exported', 'transactions_exported', 'game_results_exported', 'audit_logs_exported', 'comprehensive_report_exported']
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return exports;
    } catch (error) {
      console.error('❌ Error getting export history:', error);
      throw error;
    }
  }

  /**
   * Clean up old export files
   * @param {number} daysOld - Number of days old to consider for cleanup
   */
  static async cleanupOldExports(daysOld = 7) {
    try {
      const exportsDir = path.join(__dirname, '../exports');
      const files = await fs.readdir(exportsDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(exportsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      console.log(`✅ Cleaned up ${deletedCount} old export files`);
      return { deletedCount };
    } catch (error) {
      console.error('❌ Error cleaning up old exports:', error);
      throw error;
    }
  }
}

module.exports = ExportService;

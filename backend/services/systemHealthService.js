const { PrismaClient } = require('@prisma/client');
const os = require('os');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

class SystemHealthService {
  /**
   * Get system health metrics
   */
  static async getSystemHealth() {
    try {
      const [
        dbHealth,
        memoryUsage,
        cpuUsage,
        uptime,
        activeConnections
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.getMemoryUsage(),
        this.getCpuUsage(),
        this.getUptime(),
        this.getActiveConnections()
      ]);

      return {
        status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        system: {
          memory: memoryUsage,
          cpu: cpuUsage,
          uptime,
          activeConnections
        }
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check database health
   */
  static async checkDatabaseHealth() {
    try {
      const startTime = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = performance.now() - startTime;

      return {
        status: 'healthy',
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get memory usage
   */
  static getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100, // GB
      used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100, // GB
      free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100, // GB
      usagePercent: Math.round(usagePercent * 100) / 100
    };
  }

  /**
   * Get CPU usage
   */
  static getCpuUsage() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    return {
      cores: cpus.length,
      loadAverage: {
        '1min': Math.round(loadAverage[0] * 100) / 100,
        '5min': Math.round(loadAverage[1] * 100) / 100,
        '15min': Math.round(loadAverage[2] * 100) / 100
      }
    };
  }

  /**
   * Get system uptime
   */
  static getUptime() {
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    return {
      seconds: Math.floor(uptime),
      formatted: `${days}d ${hours}h ${minutes}m`
    };
  }

  /**
   * Get active connections count
   */
  static async getActiveConnections() {
    try {
      // This would be implemented based on your connection tracking
      // For now, return a placeholder
      return {
        current: 0,
        max: 1000
      };
    } catch (error) {
      return {
        current: 0,
        max: 1000,
        error: error.message
      };
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics() {
    try {
      const [dbMetrics, systemMetrics] = await Promise.all([
        this.getDatabaseMetrics(),
        this.getSystemMetrics()
      ]);

      return {
        database: dbMetrics,
        system: systemMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get database performance metrics
   */
  static async getDatabaseMetrics() {
    try {
      const startTime = performance.now();
      
      // Get some basic database stats
      const [userCount, transactionCount, gameCount] = await Promise.all([
        prisma.user.count(),
        prisma.transaction.count(),
        prisma.gameResult.count()
      ]);

      const responseTime = performance.now() - startTime;

      return {
        responseTime: Math.round(responseTime),
        stats: {
          users: userCount,
          transactions: transactionCount,
          games: gameCount
        }
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Get system performance metrics
   */
  static getSystemMetrics() {
    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();
    const uptime = this.getUptime();

    return {
      memory,
      cpu,
      uptime,
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };
  }
}

module.exports = SystemHealthService; 
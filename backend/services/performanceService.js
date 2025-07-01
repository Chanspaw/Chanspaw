const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

class PerformanceService {
  async logMetric(data) {
    return prisma.performanceMetric.create({ data });
  }
  async getMetrics(filter = {}) {
    return prisma.performanceMetric.findMany({ where: filter });
  }
  async getMetricById(id) {
    return prisma.performanceMetric.findUnique({ where: { id } });
  }
  async clearOldMetrics(beforeDate) {
    return prisma.performanceMetric.deleteMany({ where: { timestamp: { lt: beforeDate } } });
  }
  async logCacheEntry(data) {
    return prisma.cacheEntry.create({ data });
  }
  async getCacheEntries(filter = {}) {
    return prisma.cacheEntry.findMany({ where: filter });
  }
  async clearCache() {
    return prisma.cacheEntry.deleteMany({});
  }
  async logDbQuery(data) {
    return prisma.databaseQuery.create({ data });
  }
  async getDbQueries(filter = {}) {
    return prisma.databaseQuery.findMany({ where: filter });
  }
  async clearOldDbQueries(beforeDate) {
    return prisma.databaseQuery.deleteMany({ where: { timestamp: { lt: beforeDate } } });
  }
}

module.exports = new PerformanceService(); 
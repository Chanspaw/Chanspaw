const express = require('express');
const router = express.Router();
const performanceService = require('../services/performanceService');
const { requireAdmin } = require('../middleware/auth');

// Performance Metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const metrics = await performanceService.getMetrics(req.query);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/metrics/:id', requireAdmin, async (req, res) => {
  try {
    const metric = await performanceService.getMetricById(req.params.id);
    if (!metric) {
      return res.status(404).json({ success: false, error: 'Metric not found' });
    }
    res.json({ success: true, data: metric });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/metrics', async (req, res) => {
  try {
    const metric = await performanceService.logMetric(req.body);
    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/metrics/old', requireAdmin, async (req, res) => {
  try {
    const { beforeDate } = req.query;
    const before = beforeDate ? new Date(beforeDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const result = await performanceService.clearOldMetrics(before);
    res.json({ success: true, data: { deletedCount: result.count } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cache Management
router.get('/cache', requireAdmin, async (req, res) => {
  try {
    const cacheEntries = await performanceService.getCacheEntries(req.query);
    res.json({ success: true, data: cacheEntries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cache', async (req, res) => {
  try {
    const cacheEntry = await performanceService.logCacheEntry(req.body);
    res.status(201).json({ success: true, data: cacheEntry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/cache', requireAdmin, async (req, res) => {
  try {
    const result = await performanceService.clearCache();
    res.json({ success: true, data: { deletedCount: result.count } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database Query Monitoring
router.get('/db-queries', requireAdmin, async (req, res) => {
  try {
    const queries = await performanceService.getDbQueries(req.query);
    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/db-queries', async (req, res) => {
  try {
    const query = await performanceService.logDbQuery(req.body);
    res.status(201).json({ success: true, data: query });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/db-queries/old', requireAdmin, async (req, res) => {
  try {
    const { beforeDate } = req.query;
    const before = beforeDate ? new Date(beforeDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const result = await performanceService.clearOldDbQueries(before);
    res.json({ success: true, data: { deletedCount: result.count } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Performance Analytics
router.get('/analytics/overview', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const end = endDate ? new Date(endDate) : new Date();
    
    const metrics = await performanceService.getMetrics({
      timestamp: {
        gte: start,
        lte: end
      }
    });
    
    const analytics = {
      totalMetrics: metrics.length,
      averageCPU: metrics.filter(m => m.metric === 'CPU_USAGE').reduce((sum, m) => sum + m.value, 0) / metrics.filter(m => m.metric === 'CPU_USAGE').length || 0,
      averageMemory: metrics.filter(m => m.metric === 'MEMORY_USAGE').reduce((sum, m) => sum + m.value, 0) / metrics.filter(m => m.metric === 'MEMORY_USAGE').length || 0,
      averageResponseTime: metrics.filter(m => m.metric === 'API_RESPONSE_TIME').reduce((sum, m) => sum + m.value, 0) / metrics.filter(m => m.metric === 'API_RESPONSE_TIME').length || 0,
      averageDbQueryTime: metrics.filter(m => m.metric === 'DB_QUERY_TIME').reduce((sum, m) => sum + m.value, 0) / metrics.filter(m => m.metric === 'DB_QUERY_TIME').length || 0
    };
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analytics/slow-queries', requireAdmin, async (req, res) => {
  try {
    const { threshold = 1000 } = req.query; // Default 1 second threshold
    const queries = await performanceService.getDbQueries({
      duration: {
        gte: parseInt(threshold)
      }
    });
    
    const slowQueries = queries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest queries
    
    res.json({ success: true, data: slowQueries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System Health Check
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const recentMetrics = await performanceService.getMetrics({
      timestamp: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      }
    });
    
    const health = {
      status: 'healthy',
      cpuUsage: recentMetrics.filter(m => m.metric === 'CPU_USAGE').pop()?.value || 0,
      memoryUsage: recentMetrics.filter(m => m.metric === 'MEMORY_USAGE').pop()?.value || 0,
      diskUsage: recentMetrics.filter(m => m.metric === 'DISK_USAGE').pop()?.value || 0,
      averageResponseTime: recentMetrics.filter(m => m.metric === 'API_RESPONSE_TIME').reduce((sum, m) => sum + m.value, 0) / recentMetrics.filter(m => m.metric === 'API_RESPONSE_TIME').length || 0,
      lastUpdated: new Date()
    };
    
    // Determine overall health status
    if (health.cpuUsage > 90 || health.memoryUsage > 90 || health.diskUsage > 90) {
      health.status = 'critical';
    } else if (health.cpuUsage > 70 || health.memoryUsage > 70 || health.diskUsage > 70) {
      health.status = 'warning';
    }
    
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Performance Optimization Recommendations
router.get('/recommendations', requireAdmin, async (req, res) => {
  try {
    const recommendations = [];
    
    // Check for slow queries
    const slowQueries = await performanceService.getDbQueries({
      duration: {
        gte: 1000
      },
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    });
    
    if (slowQueries.length > 10) {
      recommendations.push({
        type: 'database',
        severity: 'high',
        message: `Found ${slowQueries.length} slow queries in the last 24 hours. Consider optimizing database queries.`
      });
    }
    
    // Check for high CPU usage
    const cpuMetrics = await performanceService.getMetrics({
      metric: 'CPU_USAGE',
      timestamp: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    });
    
    const avgCPU = cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length || 0;
    if (avgCPU > 80) {
      recommendations.push({
        type: 'system',
        severity: 'medium',
        message: `High CPU usage detected (${avgCPU.toFixed(1)}%). Consider scaling up resources.`
      });
    }
    
    // Check for high memory usage
    const memoryMetrics = await performanceService.getMetrics({
      metric: 'MEMORY_USAGE',
      timestamp: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    });
    
    const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length || 0;
    if (avgMemory > 80) {
      recommendations.push({
        type: 'system',
        severity: 'medium',
        message: `High memory usage detected (${avgMemory.toFixed(1)}%). Consider optimizing memory usage or scaling up.`
      });
    }
    
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
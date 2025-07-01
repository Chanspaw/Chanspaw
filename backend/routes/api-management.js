const express = require('express');
const router = express.Router();
const apiManagementService = require('../services/apiManagementService');
const { requireAdmin } = require('../middleware/auth');

// API Keys
router.get('/keys', requireAdmin, async (req, res) => {
  try {
    const keys = await apiManagementService.getApiKeys(req.query);
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/keys/:id', requireAdmin, async (req, res) => {
  try {
    const keys = await apiManagementService.getApiKeys({ id: req.params.id });
    if (!keys || keys.length === 0) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    res.json({ success: true, data: keys[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/keys', requireAdmin, async (req, res) => {
  try {
    const key = await apiManagementService.createApiKey(req.body, req.user.id);
    res.status(201).json({ success: true, data: key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/keys/:id', requireAdmin, async (req, res) => {
  try {
    const key = await apiManagementService.updateApiKey(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/keys/:id', requireAdmin, async (req, res) => {
  try {
    const key = await apiManagementService.revokeApiKey(req.params.id, req.user.id);
    res.json({ success: true, data: key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Requests (Logging)
router.post('/requests', async (req, res) => {
  try {
    const request = await apiManagementService.logRequest(req.body);
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/requests', requireAdmin, async (req, res) => {
  try {
    const requests = await apiManagementService.getRequests(req.query);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/requests/:id', requireAdmin, async (req, res) => {
  try {
    const requests = await apiManagementService.getRequests({ id: req.params.id });
    if (!requests || requests.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.json({ success: true, data: requests[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Endpoints
router.get('/endpoints', requireAdmin, async (req, res) => {
  try {
    const endpoints = await apiManagementService.getEndpoints(req.query);
    res.json({ success: true, data: endpoints });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/endpoints/:id', requireAdmin, async (req, res) => {
  try {
    const endpoints = await apiManagementService.getEndpoints({ id: req.params.id });
    if (!endpoints || endpoints.length === 0) {
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
    res.json({ success: true, data: endpoints[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/endpoints', requireAdmin, async (req, res) => {
  try {
    const endpoint = await apiManagementService.registerEndpoint(req.body, req.user.id);
    res.status(201).json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/endpoints/:id', requireAdmin, async (req, res) => {
  try {
    const endpoint = await apiManagementService.updateEndpoint(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/endpoints/:id', requireAdmin, async (req, res) => {
  try {
    const endpoint = await apiManagementService.deleteEndpoint(req.params.id, req.user.id);
    res.json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Analytics
router.get('/analytics/usage', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, apiKeyId } = req.query;
    const requests = await apiManagementService.getRequests({
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      },
      apiKeyId: apiKeyId || undefined
    });
    
    const analytics = {
      totalRequests: requests.length,
      uniqueIPs: [...new Set(requests.map(r => r.ipAddress))].length,
      averageResponseTime: requests.reduce((sum, r) => sum + r.duration, 0) / requests.length || 0,
      statusCodes: requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const integrationService = require('../services/integrationService');
const { requireAdmin } = require('../middleware/auth');

// Integrations
router.get('/integrations', requireAdmin, async (req, res) => {
  try {
    const integrations = await integrationService.getIntegrations(req.query);
    res.json({ success: true, data: integrations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/integrations/:id', requireAdmin, async (req, res) => {
  try {
    const integrations = await integrationService.getIntegrations({ id: req.params.id });
    if (!integrations || integrations.length === 0) {
      return res.status(404).json({ success: false, error: 'Integration not found' });
    }
    res.json({ success: true, data: integrations[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integrations', requireAdmin, async (req, res) => {
  try {
    const integration = await integrationService.createIntegration(req.body, req.user.id);
    res.status(201).json({ success: true, data: integration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/integrations/:id', requireAdmin, async (req, res) => {
  try {
    const integration = await integrationService.updateIntegration(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: integration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/integrations/:id', requireAdmin, async (req, res) => {
  try {
    const integration = await integrationService.deleteIntegration(req.params.id, req.user.id);
    res.json({ success: true, data: integration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Integration Logs
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await integrationService.getLogs(req.query);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logs', async (req, res) => {
  try {
    const log = await integrationService.logIntegrationEvent(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhooks
router.get('/webhooks', requireAdmin, async (req, res) => {
  try {
    const webhooks = await integrationService.getWebhooks(req.query);
    res.json({ success: true, data: webhooks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/webhooks/:id', requireAdmin, async (req, res) => {
  try {
    const webhooks = await integrationService.getWebhooks({ id: req.params.id });
    if (!webhooks || webhooks.length === 0) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    res.json({ success: true, data: webhooks[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhooks', requireAdmin, async (req, res) => {
  try {
    const webhook = await integrationService.createWebhook(req.body, req.user.id);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/webhooks/:id', requireAdmin, async (req, res) => {
  try {
    const webhook = await integrationService.updateWebhook(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/webhooks/:id', requireAdmin, async (req, res) => {
  try {
    const webhook = await integrationService.deleteWebhook(req.params.id, req.user.id);
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook Deliveries
router.get('/webhook-deliveries', requireAdmin, async (req, res) => {
  try {
    const deliveries = await integrationService.getWebhookDeliveries(req.query);
    res.json({ success: true, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook-deliveries', async (req, res) => {
  try {
    const delivery = await integrationService.logWebhookDelivery(req.body);
    res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Integration Sync
router.post('/integrations/:id/sync', requireAdmin, async (req, res) => {
  try {
    const integration = await integrationService.getIntegrations({ id: req.params.id });
    if (!integration || integration.length === 0) {
      return res.status(404).json({ success: false, error: 'Integration not found' });
    }
    
    // Placeholder: implement sync logic
    const updatedIntegration = await integrationService.updateIntegration(
      req.params.id, 
      { syncStatus: 'SYNCING', lastSync: new Date() }, 
      req.user.id
    );
    
    res.json({ success: true, data: updatedIntegration, message: 'Sync initiated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Integration Health Check
router.get('/integrations/:id/health', requireAdmin, async (req, res) => {
  try {
    const integration = await integrationService.getIntegrations({ id: req.params.id });
    if (!integration || integration.length === 0) {
      return res.status(404).json({ success: false, error: 'Integration not found' });
    }
    
    // Placeholder: implement health check logic
    const health = {
      status: 'healthy',
      lastSync: integration[0].lastSync,
      syncStatus: integration[0].syncStatus,
      errorLog: integration[0].errorLog
    };
    
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
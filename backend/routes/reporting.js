const express = require('express');
const router = express.Router();
const reportingService = require('../services/reportingService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Report Templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await reportingService.getTemplates(req.query);
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await reportingService.getTemplates({ id: req.params.id });
    if (!template || template.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await reportingService.createTemplate(req.body, req.user.id);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await reportingService.updateTemplate(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await reportingService.deleteTemplate(req.params.id, req.user.id);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generated Reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await reportingService.getReports(req.query);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/:id', async (req, res) => {
  try {
    const report = await reportingService.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { templateId, parameters } = req.body;
    const report = await reportingService.generateReport(templateId, parameters, req.user.id);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Report Scheduling
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await reportingService.getSchedules(req.query);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const schedule = await reportingService.scheduleReport(req.body, req.user.id);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await reportingService.updateSchedule(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    const schedule = await reportingService.deleteSchedule(req.params.id, req.user.id);
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run Scheduled Reports (admin only)
router.post('/run-scheduled', async (req, res) => {
  try {
    const result = await reportingService.runScheduledReports();
    res.json({ success: true, data: { message: 'Scheduled reports executed', result } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
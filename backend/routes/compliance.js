const express = require('express');
const router = express.Router();
const complianceService = require('../services/complianceService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Compliance Reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await complianceService.getReports(req.query);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/:id', async (req, res) => {
  try {
    const report = await complianceService.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const report = await complianceService.createReport(req.body, req.user.id);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/reports/:id/status', async (req, res) => {
  try {
    const report = await complianceService.updateReportStatus(req.params.id, req.body.status, req.user.id);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compliance Rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await complianceService.getRules(req.query);
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rules', async (req, res) => {
  try {
    const rule = await complianceService.createRule(req.body, req.user.id);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await complianceService.updateRule(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await complianceService.deleteRule(req.params.id, req.user.id);
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compliance Violations
router.get('/violations', async (req, res) => {
  try {
    const violations = await complianceService.getViolations(req.query);
    res.json({ success: true, data: violations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/violations', async (req, res) => {
  try {
    const violation = await complianceService.logViolation(req.body, req.user.id);
    res.status(201).json({ success: true, data: violation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/violations/:id/resolve', async (req, res) => {
  try {
    const violation = await complianceService.resolveViolation(req.params.id, req.user.id, req.body.resolution);
    res.json({ success: true, data: violation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Risk Scoring
router.get('/risk-score/:userId', async (req, res) => {
  try {
    const riskScore = await complianceService.riskScoreUser(req.params.userId);
    res.json({ success: true, data: { userId: req.params.userId, riskScore } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
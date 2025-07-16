const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const ownerProfitService = require('../services/ownerProfitService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get total available profits (Admin only)
router.get('/profits/available', asyncHandler(async (req, res) => {
  const profits = await ownerProfitService.getTotalAvailableProfits();
  res.json({
    success: true,
    data: profits
  });
}));

// Get profit statistics (Admin only)
router.get('/profits/statistics', asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  const statistics = await ownerProfitService.getProfitStatistics(timeRange);
  res.json({
    success: true,
    data: statistics
  });
}));

// Calculate and record platform profits (Admin only)
router.post('/profits/calculate', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Start date and end date are required'
    });
  }

  const profits = await ownerProfitService.calculatePlatformProfits(
    new Date(startDate),
    new Date(endDate)
  );

  // Record profits for each game type
  const recordedProfits = [];
  for (const [gameType, profitData] of Object.entries(profits)) {
    const recorded = await ownerProfitService.recordPlatformProfit({
      gameType,
      ...profitData
    });
    recordedProfits.push(recorded);
  }

  res.json({
    success: true,
    data: {
      calculatedProfits: profits,
      recordedProfits
    }
  });
}));

// Create owner withdrawal request (Admin only)
router.post('/withdrawals', asyncHandler(async (req, res) => {
  const { amount, method, accountDetails, notes } = req.body;

  if (!amount || !method) {
    return res.status(400).json({
      success: false,
      error: 'Amount and method are required'
    });
  }

  const withdrawal = await ownerProfitService.createOwnerWithdrawal({
    amount: parseFloat(amount),
    method,
    accountDetails,
    notes
  });

  res.json({
    success: true,
    data: withdrawal
  });
}));

// Get all owner withdrawals (Admin only)
router.get('/withdrawals', asyncHandler(async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
  
  const filters = {
    status,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    page: parseInt(page),
    limit: parseInt(limit)
  };

  const withdrawals = await ownerProfitService.getOwnerWithdrawals(filters);
  
  res.json({
    success: true,
    data: withdrawals
  });
}));

// Process owner withdrawal (approve/reject) (Admin only)
router.put('/withdrawals/:id/process', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: 'Valid action (approve or reject) is required'
    });
  }

  const withdrawal = await ownerProfitService.processOwnerWithdrawal(
    id,
    action,
    req.user.id,
    reason
  );

  res.json({
    success: true,
    data: withdrawal
  });
}));

// Complete owner withdrawal (Admin only)
router.put('/withdrawals/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const withdrawal = await ownerProfitService.completeWithdrawal(id, req.user.id);

  res.json({
    success: true,
    data: withdrawal
  });
}));

// Get withdrawal by ID (Admin only)
router.get('/withdrawals/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const withdrawal = await ownerProfitService.getOwnerWithdrawals({
    id
  });

  if (!withdrawal.withdrawals.length) {
    return res.status(404).json({
      success: false,
      error: 'Withdrawal not found'
    });
  }

  res.json({
    success: true,
    data: withdrawal.withdrawals[0]
  });
}));

// Get current owner wallet balance (Admin only)
router.get('/wallet-balance', asyncHandler(async (req, res) => {
  const balance = await ownerProfitService.getOwnerWalletBalance();
  res.json({
    success: true,
    data: balance
  });
}));

module.exports = router; 
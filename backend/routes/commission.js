const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

// In-memory or DB-backed configs (for demo, use in-memory)
const defaultConfigs = {
  'diamond-hunt': {
    gameId: 'diamond-hunt',
    gameName: 'Diamond Hunt',
    houseEdge: 10,
    winnerPercentage: 90,
    minBet: 1,
    maxBet: 100
  },
  'tic-tac-toe': {
    gameId: 'tic-tac-toe',
    gameName: 'Tic Tac Toe',
    houseEdge: 10,
    winnerPercentage: 90,
    minBet: 1,
    maxBet: 100
  }
  // Add more games as needed
};

// GET /api/commission/config/:gameId
router.get('/config/:gameId', (req, res) => {
  const { gameId } = req.params;
  const config = defaultConfigs[gameId];
  if (config) {
    res.json(config);
  } else {
    res.status(404).json({ error: 'Commission config not found' });
  }
});

// PUT /api/commission/config/:gameId
router.put('/config/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { houseEdge, winnerPercentage, minBet, maxBet } = req.body;
  if (!defaultConfigs[gameId]) {
    return res.status(404).json({ error: 'Commission config not found' });
  }
  if (houseEdge !== undefined) defaultConfigs[gameId].houseEdge = houseEdge;
  if (winnerPercentage !== undefined) defaultConfigs[gameId].winnerPercentage = winnerPercentage;
  if (minBet !== undefined) defaultConfigs[gameId].minBet = minBet;
  if (maxBet !== undefined) defaultConfigs[gameId].maxBet = maxBet;
  res.json(defaultConfigs[gameId]);
});

router.get('/config/chess', asyncHandler(async (req, res) => {
  // Example config, adjust as needed
  res.json({
    success: true,
    data: {
      minBet: 1,
      maxBet: 1000,
      commissionPercent: 10,
      payoutPercent: 90,
      currency: ['real', 'virtual']
    }
  });
}));

module.exports = router; 
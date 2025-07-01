const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get rules for a game
router.get('/:gameType', async (req, res) => {
  const { gameType } = req.params;
  try {
    const rule = await prisma.gameRule.findUnique({ where: { gameType } });
    if (!rule) return res.status(404).json({ error: 'Rules not found' });
    res.json({ gameType, rules_en: rule.rules_en });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update rules for a game (admin only)
router.put('/:gameType', async (req, res) => {
  const { gameType } = req.params;
  const { rules_en } = req.body;
  if (!rules_en) return res.status(400).json({ error: 'rules_en is required' });
  try {
    const rule = await prisma.gameRule.upsert({
      where: { gameType },
      update: { rules_en },
      create: { gameType, rules_en }
    });
    res.json({ gameType, rules_en: rule.rules_en });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getSupportAIResponse } = require('../services/supportAIService');

const router = express.Router();
const prisma = new PrismaClient();

// Get all support tickets (admin only)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { tickets }
  });
}));

// Get disputes (admin only)
router.get('/disputes', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const disputes = [
    {
      id: 'dispute-1',
      userId: 'user-1',
      username: 'user1',
      type: 'payment',
      description: 'Payment not received',
      status: 'open',
      createdAt: new Date()
    }
  ];

  res.json({
    success: true,
    data: { disputes }
  });
}));

// Get support tickets for regular users
router.get('/tickets', authenticateToken, asyncHandler(async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { tickets }
  });
}));

// Create support ticket
router.post('/tickets', authenticateToken, asyncHandler(async (req, res) => {
  const { subject, description, category, priority } = req.body;

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user.id,
      subject,
      description,
      category: category || 'OTHER',
      priority: priority || 'MEDIUM'
    }
  });

  res.json({
    success: true,
    data: { ticket }
  });
}));

// AI Support Chat Endpoint
router.post('/ai', asyncHandler(async (req, res) => {
  const { messages, tries } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: 'messages array required' });
  }
  const result = await getSupportAIResponse(messages, tries || 1);
  res.json({ success: true, ...result });
}));

module.exports = router; 
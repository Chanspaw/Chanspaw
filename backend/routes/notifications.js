const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Get all notifications (admin only)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  res.json({
    success: true,
    data: { notifications }
  });
}));

// Get scheduled messages (admin only)
router.get('/scheduled', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const scheduled = await prisma.scheduledMessage.findMany({
    orderBy: { scheduledFor: 'asc' }
  });
  res.json({
    success: true,
    data: { scheduled }
  });
}));

// Get notification templates (admin only)
router.get('/templates', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json({
    success: true,
    data: { templates }
  });
}));

// Get user notifications
router.get('/user', authenticateToken, asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({
    success: true,
    data: { notifications }
  });
}));

// Mark notification as read
router.patch('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.update({
    where: { 
      id,
      userId: req.user.id 
    },
    data: { isRead: true }
  });

  res.json({
    success: true,
    data: { notification }
  });
}));

module.exports = router; 
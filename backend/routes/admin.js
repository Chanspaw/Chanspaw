const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const auditService = require('../services/auditService');
const securityService = require('../services/securityService');
const bulkUserService = require('../services/bulkUserService');
const manualTransactionService = require('../services/manualTransactionService');
const systemHealthService = require('../services/systemHealthService');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== USER MANAGEMENT ====================

// Get all users (admin only)
router.get('/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      real_balance: true,
      virtual_balance: true,
      isAdmin: true,
      isVerified: true,
      isActive: true,
      dateOfBirth: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { users }
  });
}));

// Get user by ID
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      real_balance: true,
      virtual_balance: true,
      isAdmin: true,
      isVerified: true,
      isActive: true,
      dateOfBirth: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Update user
router.put('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive, isVerified, real_balance, virtual_balance, roleId } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      isActive: isActive !== undefined ? isActive : undefined,
      isVerified: isVerified !== undefined ? isVerified : undefined,
      real_balance: real_balance !== undefined ? parseFloat(real_balance) : undefined,
      virtual_balance: virtual_balance !== undefined ? parseFloat(virtual_balance) : undefined,
      roleId: roleId !== undefined ? roleId : undefined
    }
  });

  res.json({
    success: true,
    data: { user },
    message: 'User updated successfully'
  });
}));

// Delete user
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.user.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// Update user status
router.put('/users/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Map status to isActive field
  let isActive = true;
  if (status === 'suspended' || status === 'banned') {
    isActive = false;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive }
  });

  res.json({
    success: true,
    data: { user },
    message: `User status updated to ${status}`
  });
}));

// Bulk user actions
router.post('/users/bulk-action', asyncHandler(async (req, res) => {
  const { userIds, action } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'User IDs are required' });
  }

  let updateData = {};
  
  switch (action) {
    case 'suspend':
      updateData = { isActive: false };
      break;
    case 'activate':
      updateData = { isActive: true };
      break;
    case 'verify':
      updateData = { isVerified: true };
      break;
    case 'delete':
      // Delete users
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
      
      res.json({
        success: true,
        message: `${userIds.length} users deleted successfully`
      });
      return;
    default:
      return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  // Update users
  const result = await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: updateData
  });

  res.json({
    success: true,
    data: { updatedCount: result.count },
    message: `Bulk ${action} completed for ${result.count} users`
  });
}));

// ==================== KYC MANAGEMENT ====================

// Get KYC requests
router.get('/kyc-requests', asyncHandler(async (req, res) => {
  const kycRequests = await prisma.user.findMany({
    where: {
      isVerified: false
    },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      isVerified: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { kycRequests }
  });
}));

// Approve KYC request
router.post('/kyc-requests/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.user.update({
    where: { id },
    data: { isVerified: true }
  });

  res.json({
    success: true,
    message: 'KYC request approved'
  });
}));

// Reject KYC request
router.post('/kyc-requests/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.user.update({
    where: { id },
    data: { isVerified: false }
  });

  res.json({
    success: true,
    message: 'KYC request rejected'
  });
}));

// Update KYC request status
router.put('/kyc-requests/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  // Map status to isVerified field
  let isVerified = false;
  if (status === 'approved') {
    isVerified = true;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isVerified }
  });

  res.json({
    success: true,
    data: { user },
    message: `KYC status updated to ${status}`
  });
}));

// ==================== PAYMENT MANAGEMENT ====================

// Get all transactions (only real money)
router.get('/transactions', asyncHandler(async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: { not: null } // Only user transactions, not system transactions
    },
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
    data: { transactions }
  });
}));

// Get transaction by ID
router.get('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  res.json({
    success: true,
    data: { transaction }
  });
}));

// Update transaction status
router.put('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: { status }
  });

  res.json({
    success: true,
    data: { transaction },
    message: 'Transaction updated successfully'
  });
}));

// ==================== SUPPORT MANAGEMENT ====================

// Get support tickets
router.get('/support-tickets', asyncHandler(async (req, res) => {
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

// Get support ticket by ID
router.get('/support-tickets/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Support ticket not found' });
  }

  res.json({
    success: true,
    data: { ticket }
  });
}));

// Update support ticket status
router.put('/support-tickets/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, priority } = req.body;

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { 
      status: status || undefined,
      priority: priority || undefined
    }
  });

  res.json({
    success: true,
    data: { ticket },
    message: 'Support ticket updated successfully'
  });
}));

// Add message to support ticket
router.post('/support-tickets/:id/messages', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  const ticketMessage = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      userId: req.user.id,
      message,
      isAdmin: true
    }
  });

  res.json({
    success: true,
    data: { message: ticketMessage },
    message: 'Message added successfully'
  });
}));

// ==================== CONTENT MANAGEMENT ====================

// Get all content
router.get('/content', asyncHandler(async (req, res) => {
  const content = await prisma.content.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { content }
  });
}));

// Create content
router.post('/content', asyncHandler(async (req, res) => {
  const { title, content: contentText, type, isPublished } = req.body;

  const newContent = await prisma.content.create({
    data: {
      title,
      content: contentText,
      type,
      isPublished: isPublished || false,
      authorId: req.user.id
    }
  });

  res.json({
    success: true,
    data: { content: newContent },
    message: 'Content created successfully'
  });
}));

// Update content
router.put('/content/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content: contentText, type, isPublished } = req.body;

  const content = await prisma.content.update({
    where: { id },
    data: {
      title,
      content: contentText,
      type,
      isPublished
    }
  });

  res.json({
    success: true,
    data: { content },
    message: 'Content updated successfully'
  });
}));

// Delete content
router.delete('/content/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.content.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Content deleted successfully'
  });
}));

// ==================== NOTIFICATION MANAGEMENT ====================

// Get all notifications
router.get('/notifications', asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { notifications }
  });
}));

// Create notification
router.post('/notifications', asyncHandler(async (req, res) => {
  const { userId, title, message, type } = req.body;

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type
    }
  });

  res.json({
    success: true,
    data: { notification },
    message: 'Notification created successfully'
  });
}));

// Send notification to all users
router.post('/notifications/broadcast', asyncHandler(async (req, res) => {
  const { title, message, type } = req.body;

  const users = await prisma.user.findMany({
    select: { id: true }
  });

  const notifications = await Promise.all(
    users.map(user => 
      prisma.notification.create({
        data: {
          userId: user.id,
          title,
          message,
          type
        }
      })
    )
  );

  res.json({
    success: true,
    data: { notifications },
    message: `Notification sent to ${users.length} users`
  });
}));

// ==================== GAME MANAGEMENT ====================

// Get all games (for admin panel - shows all games including inactive)
router.get('/games', asyncHandler(async (req, res) => {
  const games = await prisma.game.findMany({
    include: {
      rules: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { games }
  })
}));

// Get active games only (for frontend - shows only active games)
router.get('/games/active', asyncHandler(async (req, res) => {
  const games = await prisma.game.findMany({
    where: { isActive: true },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { games }
  })
}));

// Add new game
router.post('/games', asyncHandler(async (req, res) => {
  const { name, description, icon, minBet, maxBet, players, isActive, rules } = req.body;

  // Ensure icon is a string - handle both string and object cases
  let iconValue = icon;
  if (typeof icon === 'object' && icon !== null) {
    iconValue = icon.name || icon.value || 'Gamepad2';
  } else if (typeof icon !== 'string') {
    iconValue = 'Gamepad2';
  }

  const game = await prisma.game.create({
    data: {
      name,
      description,
      icon: iconValue,
      minBet: parseFloat(minBet),
      maxBet: parseFloat(maxBet),
      players: players.toString(),
      isActive: isActive !== undefined ? isActive : true
    }
  });

  // Create game rules if provided
  if (rules && Array.isArray(rules)) {
    await Promise.all(rules.map(rule => 
      prisma.gameRule.create({
        data: {
          gameId: game.id,
          name: rule.name,
          type: rule.type,
          value: String(rule.value),
          description: rule.description,
          options: rule.options || []
        }
      })
    ));
  }

  res.json({
    success: true,
    data: { game },
    message: 'Game created successfully'
  });
}));

// Update game
router.put('/games/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, minBet, maxBet, players, isActive, rules } = req.body;

  // Build update data object with only provided fields
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (minBet !== undefined) updateData.minBet = parseFloat(minBet);
  if (maxBet !== undefined) updateData.maxBet = parseFloat(maxBet);
  if (players !== undefined) updateData.players = players.toString();
  if (isActive !== undefined) updateData.isActive = isActive;

  // Handle icon field
  if (icon !== undefined) {
    let iconValue = icon;
    if (typeof icon === 'object' && icon !== null) {
      iconValue = icon.name || icon.value || 'Gamepad2';
    } else if (typeof icon !== 'string') {
      iconValue = 'Gamepad2';
    }
    updateData.icon = iconValue;
  }

  const game = await prisma.game.update({
    where: { id },
    data: updateData
  });

  // Update game rules if provided
  if (rules && Array.isArray(rules)) {
    // Delete existing rules
    await prisma.gameRule.deleteMany({
      where: { gameId: id }
    });

    // Create new rules
    await Promise.all(rules.map(rule => 
      prisma.gameRule.create({
        data: {
          gameId: id,
          name: rule.name,
          type: rule.type,
          value: String(rule.value),
          description: rule.description,
          options: rule.options || []
        }
      })
    ));
  }

  res.json({
    success: true,
    data: { game },
    message: 'Game updated successfully'
  });
}));

// Delete game
router.delete('/games/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.game.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Game deleted successfully'
  });
}));

// Get all game results (only real money games)
router.get('/game-results', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, gameType, result, userId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { matchType: 'real' }; // Only real money games
  if (gameType) where.gameType = gameType;
  if (result) where.result = result;
  if (userId) where.userId = userId;

  const [gameResults, total] = await Promise.all([
    prisma.gameResult.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.gameResult.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      gameResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Get game statistics (only real money)
router.get('/game-stats', asyncHandler(async (req, res) => {
  const { timeRange = '7d' } = req.query;
  
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const [gameStats, totalStats] = await Promise.all([
    prisma.gameResult.groupBy({
      by: ['gameType', 'result'],
      where: {
        matchType: 'real',
        createdAt: { gte: startDate }
      },
      _count: { result: true },
      _sum: { betAmount: true, winAmount: true }
    }),
    
    prisma.gameResult.aggregate({
      where: {
        matchType: 'real',
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { betAmount: true, winAmount: true }
    })
  ]);

  // Calculate platform revenue (fees from real money games)
  const platformRevenue = totalStats._sum.betAmount - totalStats._sum.winAmount;

  res.json({
    success: true,
    data: {
      timeRange,
      totalGames: totalStats._count.id || 0,
      totalBets: totalStats._sum.betAmount || 0,
      totalWins: totalStats._sum.winAmount || 0,
      platformRevenue: platformRevenue || 0,
      gameStats: gameStats.map(stat => ({
        gameType: stat.gameType,
        result: stat.result,
        count: stat._count.result,
        totalBets: stat._sum.betAmount || 0,
        totalWins: stat._sum.winAmount || 0
      }))
    }
  });
}));

// Get all matches (only real money)
router.get('/matches', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, gameType } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { matchType: 'real' }; // Only real money matches
  if (status) where.status = status;
  if (gameType) where.gameType = gameType;

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: {
        // Include player details
        player1: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        player2: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        winner: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.match.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// ==================== WALLET MANAGEMENT ====================

// Get wallet statistics
router.get('/wallets/stats', asyncHandler(async (req, res) => {
  const totalRealBalance = await prisma.user.aggregate({
    _sum: { real_balance: true }
  });
  const userCount = await prisma.user.count();
  const stats = {
    totalRealBalance: totalRealBalance._sum.real_balance || 0,
    userCount,
    averageRealBalance: userCount > 0 ? (totalRealBalance._sum.real_balance || 0) / userCount : 0
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

// ==================== SYSTEM MANAGEMENT ====================

// Get admin roles
router.get('/roles', asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany();
  res.json({ success: true, data: { roles } });
}));

// Get activity logs
router.get('/activity-logs', asyncHandler(async (req, res) => {
  const logs = await prisma.transaction.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      amount: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: { logs }
  });
}));

// Get system backups
router.get('/backups', asyncHandler(async (req, res) => {
  const backups = [
    {
      id: 'backup-1',
      name: 'Daily Backup',
      size: '2.5GB',
      createdAt: new Date(),
      status: 'completed'
    }
  ];

  res.json({
    success: true,
    data: { backups }
  });
}));

// Get admin alerts
router.get('/alerts', asyncHandler(async (req, res) => {
  const alerts = [
    {
      id: 'alert-1',
      type: 'security',
      message: 'Multiple failed login attempts detected',
      severity: 'high',
      createdAt: new Date()
    }
  ];

  res.json({
    success: true,
    data: { alerts }
  });
}));

// Get admin settings
router.get('/settings', asyncHandler(async (req, res) => {
  const settings = {
    siteName: 'Chanspaw Gaming Platform',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: false,
    maxBetAmount: 1000,
    minWithdrawalAmount: 10,
    maxWithdrawalAmount: 5000,
    commissionRate: 0.05
  };

  res.json({
    success: true,
    data: { settings }
  });
}));

// Update admin settings
router.put('/settings', asyncHandler(async (req, res) => {
  const {
    siteName,
    maintenanceMode,
    registrationEnabled,
    emailVerificationRequired,
    maxBetAmount,
    minWithdrawalAmount,
    maxWithdrawalAmount,
    commissionRate
  } = req.body;

  // In a real app, you'd save these to a database
  const settings = {
    siteName: siteName || 'Chanspaw Gaming Platform',
    maintenanceMode: maintenanceMode || false,
    registrationEnabled: registrationEnabled !== undefined ? registrationEnabled : true,
    emailVerificationRequired: emailVerificationRequired || false,
    maxBetAmount: maxBetAmount || 1000,
    minWithdrawalAmount: minWithdrawalAmount || 10,
    maxWithdrawalAmount: maxWithdrawalAmount || 5000,
    commissionRate: commissionRate || 0.05
  };

  res.json({
    success: true,
    data: { settings },
    message: 'Settings updated successfully'
  });
}));

// ==================== AUDIT LOGGING ====================

// Get audit logs
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const {
    adminId,
    userId,
    action,
    resourceType,
    startDate,
    endDate,
    success,
    limit = 50,
    offset = 0
  } = req.query;

  const filters = {
    adminId,
    userId,
    action,
    resourceType,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    success: success !== undefined ? success === 'true' : undefined,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };

  const result = await auditService.getAuditLogs(filters);

  res.json({
    success: true,
    data: result
  });
}));

// Get audit statistics
router.get('/audit-stats', asyncHandler(async (req, res) => {
  const stats = await auditService.getAuditStats();

  res.json({
    success: true,
    data: stats
  });
}));

// Export audit logs
router.get('/audit-logs/export', asyncHandler(async (req, res) => {
  const filters = req.query;
  const csvData = await auditService.exportAuditLogs(filters);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
  
  const csvContent = [
    csvData.headers.join(','),
    ...csvData.rows.map(row => row.join(','))
  ].join('\n');

  res.send(csvContent);
}));

// ==================== ENHANCED SECURITY ====================

// Get security statistics
router.get('/security/stats', asyncHandler(async (req, res) => {
  const stats = await securityService.getSecurityStats();

  res.json({
    success: true,
    data: stats
  });
}));

// Get admin sessions
router.get('/security/sessions', asyncHandler(async (req, res) => {
  const { adminId } = req.query;
  
  if (!adminId) {
    return res.status(400).json({
      success: false,
      message: 'Admin ID is required'
    });
  }

  const sessions = await securityService.getAdminSessions(adminId);

  res.json({
    success: true,
    data: { sessions }
  });
}));

// Invalidate admin session
router.post('/security/sessions/:sessionToken/invalidate', asyncHandler(async (req, res) => {
  const { sessionToken } = req.params;
  
  const success = await securityService.invalidateAdminSession(sessionToken);

  res.json({
    success,
    message: success ? 'Session invalidated successfully' : 'Failed to invalidate session'
  });
}));

// Invalidate all sessions for admin
router.post('/security/sessions/invalidate-all', asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  
  if (!adminId) {
    return res.status(400).json({
      success: false,
      message: 'Admin ID is required'
    });
  }

  const success = await securityService.invalidateAllAdminSessions(adminId);

  res.json({
    success,
    message: success ? 'All sessions invalidated successfully' : 'Failed to invalidate sessions'
  });
}));

// Generate MFA secret
router.post('/security/mfa/generate', asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  
  if (!adminId) {
    return res.status(400).json({
      success: false,
      message: 'Admin ID is required'
    });
  }

  const mfaData = await securityService.generateMFASecret(adminId);

  res.json({
    success: true,
    data: mfaData
  });
}));

// Verify MFA token
router.post('/security/mfa/verify', asyncHandler(async (req, res) => {
  const { secret, token } = req.body;
  
  if (!secret || !token) {
    return res.status(400).json({
      success: false,
      message: 'Secret and token are required'
    });
  }

  const isValid = await securityService.verifyMFAToken(secret, token);

  res.json({
    success: isValid,
    message: isValid ? 'MFA token is valid' : 'Invalid MFA token'
  });
}));

// ==================== BULK USER OPERATIONS ====================

// Bulk update user status
router.post('/users/bulk/status', asyncHandler(async (req, res) => {
  const {
    userIds,
    action,
    reason
  } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User IDs array is required'
    });
  }

  if (!action || !['ban', 'suspend', 'activate', 'verify', 'unverify'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Valid action is required'
    });
  }

  const result = await bulkUserService.bulkUpdateUserStatus({
    userIds,
    action,
    adminId: req.user.id,
    reason: reason || 'Bulk operation',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    data: result
  });
}));

// Bulk update user balances
router.post('/users/bulk/balances', asyncHandler(async (req, res) => {
  const {
    userIds,
    balanceType,
    amount,
    operation,
    reason
  } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User IDs array is required'
    });
  }

  if (!balanceType || !['real', 'virtual'].includes(balanceType)) {
    return res.status(400).json({
      success: false,
      message: 'Valid balance type is required'
    });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required'
    });
  }

  if (!operation || !['add', 'subtract'].includes(operation)) {
    return res.status(400).json({
      success: false,
      message: 'Valid operation is required'
    });
  }

  const result = await bulkUserService.bulkUpdateUserBalances({
    userIds,
    balanceType,
    amount,
    operation,
    adminId: req.user.id,
    reason: reason || 'Bulk balance operation',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    data: result
  });
}));

// Bulk delete users
router.post('/users/bulk/delete', asyncHandler(async (req, res) => {
  const {
    userIds,
    reason
  } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User IDs array is required'
    });
  }

  const result = await bulkUserService.bulkDeleteUsers({
    userIds,
    adminId: req.user.id,
    reason: reason || 'Bulk deletion',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    data: result
  });
}));

// Bulk export user data
router.post('/users/bulk/export', asyncHandler(async (req, res) => {
  const {
    userIds,
    fields
  } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User IDs array is required'
    });
  }

  const result = await bulkUserService.bulkExportUserData({
    userIds,
    fields: fields || ['id', 'username', 'email', 'isActive', 'isVerified', 'real_balance', 'virtual_balance', 'createdAt']
  });

  res.json({
    success: true,
    data: result
  });
}));

// Get bulk operation statistics
router.get('/users/bulk/stats', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const stats = await bulkUserService.getBulkOperationStats(
    req.user.id,
    startDate ? new Date(startDate) : null,
    endDate ? new Date(endDate) : null
  );

  res.json({
    success: true,
    data: stats
  });
}));

// ==================== MANUAL TRANSACTION MANAGEMENT ====================

// Create manual transaction
router.post('/transactions/manual', asyncHandler(async (req, res) => {
  const {
    userId,
    type,
    amount,
    description,
    reason,
    metadata
  } = req.body;

  // Validate parameters
  const validation = manualTransactionService.validateTransactionParams({
    userId,
    type,
    amount,
    description,
    reason
  });

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  const result = await manualTransactionService.createManualTransaction({
    userId,
    type,
    amount: parseFloat(amount),
    description,
    adminId: req.user.id,
    reason,
    metadata: metadata || {},
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    data: result
  });
}));

// Reverse transaction
router.post('/transactions/:transactionId/reverse', asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Reason is required for transaction reversal'
    });
  }

  const result = await manualTransactionService.reverseTransaction({
    transactionId,
    adminId: req.user.id,
    reason,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    data: result
  });
}));

// Get manual transaction statistics
router.get('/transactions/manual/stats', asyncHandler(async (req, res) => {
  const {
    adminId,
    type,
    startDate,
    endDate
  } = req.query;

  const filters = {
    adminId,
    type,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null
  };

  const stats = await manualTransactionService.getManualTransactionStats(filters);

  res.json({
    success: true,
    data: stats
  });
}));

// Get transaction approval workflow
router.get('/transactions/approval-workflow', asyncHandler(async (req, res) => {
  const { amount } = req.query;
  
  if (!amount || isNaN(amount)) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required'
    });
  }

  const workflow = manualTransactionService.getApprovalWorkflow(parseFloat(amount));

  res.json({
    success: true,
    data: workflow
  });
}));

// ==================== SYSTEM HEALTH MONITORING ====================

// Get system health
router.get('/system/health', asyncHandler(async (req, res) => {
  const health = await systemHealthService.getSystemHealth();

  res.json({
    success: true,
    data: health
  });
}));

// Get system information
router.get('/system/info', asyncHandler(async (req, res) => {
  const info = systemHealthService.getSystemInfo();

  res.json({
    success: true,
    data: info
  });
}));

// Start health monitoring
router.post('/system/health/start-monitoring', asyncHandler(async (req, res) => {
  const { intervalMs } = req.body;
  
  const interval = systemHealthService.startMonitoring(intervalMs || 60000);

  res.json({
    success: true,
    message: 'Health monitoring started',
    data: { intervalId: interval }
  });
}));

// Stop health monitoring
router.post('/system/health/stop-monitoring', asyncHandler(async (req, res) => {
  const { intervalId } = req.body;
  
  systemHealthService.stopMonitoring(intervalId);

  res.json({
    success: true,
    message: 'Health monitoring stopped'
  });
}));

// Clean up expired sessions
router.post('/system/cleanup/sessions', asyncHandler(async (req, res) => {
  const cleanedCount = await securityService.cleanupExpiredSessions();

  res.json({
    success: true,
    message: `Cleaned up ${cleanedCount} expired sessions`,
    data: { cleanedCount }
  });
}));

// ==================== INVITE-BASED MATCH ADMIN ====================

// List/filter all invite-based matches (real and virtual)
router.get('/invites', requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, gameType, userId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { matchType: { in: ['real', 'virtual'] }, status: undefined };
  if (status) where.status = status;
  if (gameType) where.gameType = gameType;
  if (userId) where.OR = [{ player1Id: userId }, { player2Id: userId }];
  // Only invite-based matches (with audit log INVITE_SENT or similar)
  // For now, fetch all matches and filter by audit log
  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        player1: { select: { id: true, username: true } },
        player2: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } }
      }
    }),
    prisma.match.count({ where })
  ]);
  // Filter to only those with INVITE_SENT audit log
  const matchIds = matches.map(m => m.id);
  const inviteLogs = await prisma.auditLog.findMany({
    where: { action: 'INVITE_SENT', details: { contains: '' }, resourceId: { in: matchIds } },
    select: { resourceId: true }
  });
  const inviteMatchIds = new Set(inviteLogs.map(l => l.resourceId));
  const inviteMatches = matches.filter(m => inviteMatchIds.has(m.id));
  res.json({
    success: true,
    data: {
      matches: inviteMatches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: inviteMatches.length,
        pages: Math.ceil(inviteMatches.length / parseInt(limit))
      }
    }
  });
}));

// Cancel an invite-based match (admin)
router.post('/invites/:id/cancel', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
  if (match.status !== 'active') return res.status(400).json({ success: false, error: 'Match is not active' });
  // Refund both players
  const refundAmount = match.betAmount;
  if (match.matchType === 'real') {
    await prisma.user.update({ where: { id: match.player1Id }, data: { real_balance: { increment: refundAmount } } });
    await prisma.user.update({ where: { id: match.player2Id }, data: { real_balance: { increment: refundAmount } } });
  } else {
    await prisma.user.update({ where: { id: match.player1Id }, data: { virtual_balance: { increment: refundAmount } } });
    await prisma.user.update({ where: { id: match.player2Id }, data: { virtual_balance: { increment: refundAmount } } });
  }
  await prisma.match.update({ where: { id }, data: { status: 'cancelled', completedAt: new Date() } });
  await prisma.auditLog.create({ data: { adminId: req.user.id, action: 'INVITE_MATCH_CANCELLED', resourceType: 'Match', resourceId: id, details: JSON.stringify({ matchId: id, reason: 'Admin cancelled and refunded' }) } });
  res.json({ success: true, message: 'Match cancelled and refunded' });
}));

// Delete an invite-based match (admin)
router.delete('/invites/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.match.delete({ where: { id } });
  await prisma.auditLog.create({ data: { adminId: req.user.id, action: 'INVITE_MATCH_DELETED', resourceType: 'Match', resourceId: id, details: JSON.stringify({ matchId: id }) } });
  res.json({ success: true, message: 'Match deleted' });
}));

// Refund an invite-based match (admin, if not already refunded)
router.post('/invites/:id/refund', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
  if (match.status === 'refunded') return res.status(400).json({ success: false, error: 'Already refunded' });
  const refundAmount = match.betAmount;
  if (match.matchType === 'real') {
    await prisma.user.update({ where: { id: match.player1Id }, data: { real_balance: { increment: refundAmount } } });
    await prisma.user.update({ where: { id: match.player2Id }, data: { real_balance: { increment: refundAmount } } });
  } else {
    await prisma.user.update({ where: { id: match.player1Id }, data: { virtual_balance: { increment: refundAmount } } });
    await prisma.user.update({ where: { id: match.player2Id }, data: { virtual_balance: { increment: refundAmount } } });
  }
  await prisma.match.update({ where: { id }, data: { status: 'refunded', completedAt: new Date() } });
  await prisma.auditLog.create({ data: { adminId: req.user.id, action: 'INVITE_MATCH_REFUNDED', resourceType: 'Match', resourceId: id, details: JSON.stringify({ matchId: id, reason: 'Admin refunded' }) } });
  res.json({ success: true, message: 'Match refunded' });
}));

module.exports = router; 
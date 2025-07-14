const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin, requireOwnership } = require('../middleware/auth');
const { hashPassword, validatePassword, validateEmail, validateUsername } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Obtenir tous les utilisateurs (Admin seulement)
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isAdmin: true,
      isVerified: true,
      isActive: true,
      dateOfBirth: true,
      createdAt: true,
      real_balance: true,
      virtual_balance: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { users }
  });
}));

// Obtenir le profil de l'utilisateur connecté
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      real_balance: true,
      virtual_balance: true,
      isActive: true,
      isVerified: true,
      isAdmin: true,
      createdAt: true
    }
  });

  res.json({
    success: true,
    data: { user }
  });
}));

// Mettre à jour le profil de l'utilisateur connecté
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, avatar } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      avatar: avatar || undefined
    },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
      isVerified: true,
      isAdmin: true,
      createdAt: true
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
}));

// Changer le mot de passe
router.put('/change-password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
  }

  // Récupérer l'utilisateur avec le hash du mot de passe
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { password: true }
  });

  // Vérifier le mot de passe actuel
  const bcrypt = require('bcrypt');
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  
  if (!isValidPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Valider le nouveau mot de passe
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Password validation failed',
      details: passwordValidation.errors
    });
  }

  // Hasher et sauvegarder le nouveau mot de passe
  const hashedPassword = await hashPassword(newPassword);
  
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date()
    }
  });

  // Supprimer toutes les sessions existantes
  await prisma.session.deleteMany({
    where: { userId: req.user.id }
  });

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.'
  });
}));

// Obtenir les statistiques de l'utilisateur
router.get('/stats', asyncHandler(async (req, res) => {
  const [gameStats, transactionStats, friendStats] = await Promise.all([
    // Statistiques des jeux
    prisma.gameResult.groupBy({
      by: ['result'],
      where: { userId: req.user.id },
      _count: { result: true },
      _sum: { betAmount: true, winAmount: true }
    }),
    
    // Statistiques des transactions
    prisma.transaction.groupBy({
      by: ['type', 'status'],
      where: { userId: req.user.id },
      _count: { type: true },
      _sum: { amount: true }
    }),
    
    // Statistiques des amis
    prisma.friend.count({
      where: { userId: req.user.id }
    })
  ]);

  // Calculer les statistiques
  const totalGames = gameStats.reduce((sum, stat) => sum + stat._count.result, 0);
  const totalBets = gameStats.reduce((sum, stat) => sum + (stat._sum.betAmount || 0), 0);
  const totalWins = gameStats.reduce((sum, stat) => {
    if (stat.result === 'WIN') {
      return sum + (stat._sum.winAmount || 0);
    }
    return sum;
  }, 0);
  const winRate = totalGames > 0 ? (gameStats.find(s => s.result === 'WIN')?._count.result || 0) / totalGames * 100 : 0;

  res.json({
    success: true,
    data: {
      games: {
        total: totalGames,
        wins: gameStats.find(s => s.result === 'WIN')?._count.result || 0,
        losses: gameStats.find(s => s.result === 'LOSS')?._count.result || 0,
        draws: gameStats.find(s => s.result === 'DRAW')?._count.result || 0,
        totalBets,
        totalWins,
        winRate: Math.round(winRate * 100) / 100
      },
      transactions: transactionStats,
      friends: friendStats
    }
  });
}));

// Obtenir l'historique des jeux
router.get('/game-history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, gameType } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  if (gameType) {
    where.gameType = gameType;
  }

  const [gameResults, total] = await Promise.all([
    prisma.gameResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        gameType: true,
        betAmount: true,
        winAmount: true,
        result: true,
        metadata: true,
        createdAt: true
      }
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

// Obtenir l'historique des transactions
router.get('/transaction-history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  if (type) where.type = type;
  if (status) where.status = status;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        metadata: true,
        createdAt: true
      }
    }),
    prisma.transaction.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Obtenir les notifications
router.get('/notifications', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.notification.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Marquer une notification comme lue
router.put('/notifications/:id/read', asyncHandler(async (req, res) => {
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
    message: 'Notification marked as read',
    data: { notification }
  });
}));

// Marquer toutes les notifications comme lues
router.put('/notifications/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.user.id,
      isRead: false
    },
    data: { isRead: true }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// Routes admin - Obtenir tous les utilisateurs
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (status !== undefined) {
    if (status === 'ACTIVE' || status === 'true' || status === true) {
      where.isActive = true;
    } else if (status === 'INACTIVE' || status === 'false' || status === false) {
      where.isActive = false;
    }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        isAdmin: true,
        createdAt: true,
        real_balance: true,
        virtual_balance: true
      }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Route admin - Obtenir un utilisateur spécifique
router.get('/:id', requireAdmin, asyncHandler(async (req, res) => {
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
      isActive: true,
      isVerified: true,
      isAdmin: true,
      createdAt: true,
      real_balance: true,
      virtual_balance: true,
      _count: {
        select: {
          gameResults: true,
          transactions: true,
          friends: true,
          sessions: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Route admin - Mettre à jour un utilisateur
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, isAdmin, emailVerified, real_balance, virtual_balance } = req.body;

  let isActive;
  if (status !== undefined) {
    if (status === 'ACTIVE' || status === 'true' || status === true) {
      isActive = true;
    } else if (status === 'INACTIVE' || status === 'false' || status === false) {
      isActive = false;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      isActive: isActive,
      isAdmin: isAdmin !== undefined ? isAdmin : undefined,
      real_balance: real_balance !== undefined ? parseFloat(real_balance) : undefined,
      virtual_balance: virtual_balance !== undefined ? parseFloat(virtual_balance) : undefined
    },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      real_balance: true,
      virtual_balance: true,
      isActive: true,
      isVerified: true,
      isAdmin: true,
      createdAt: true
    }
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser }
  });
}));

module.exports = router; 
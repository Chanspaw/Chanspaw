const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { payoutWinnings } = require('../services/walletService');

const router = express.Router();
const prisma = new PrismaClient();

// Obtenir le solde de l'utilisateur
router.get('/balance', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { real_balance: true, virtual_balance: true }
  });

  res.json({
    success: true,
    data: { real_balance: user.real_balance, virtual_balance: user.virtual_balance }
  });
}));

// Disable deposit simulation endpoint
router.post('/deposit', (req, res) => {
  return res.status(403).json({ success: false, error: 'Deposits are disabled. Real deposits are not yet implemented.' });
});

// Effectuer un retrait (simulation)
router.post('/withdraw', asyncHandler(async (req, res) => {
  const { amount, withdrawalMethod, accountDetails } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid amount is required'
    });
  }

  if (!withdrawalMethod) {
    return res.status(400).json({
      success: false,
      error: 'Withdrawal method is required'
    });
  }

  // Vérifier le solde de l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { real_balance: true }
  });

  if (user.real_balance < amount) {
    return res.status(400).json({
      success: false,
      error: 'Insufficient balance'
    });
  }

  // Vérifier le montant minimum de retrait
  const minWithdrawal = 10;
  if (amount < minWithdrawal) {
    return res.status(400).json({
      success: false,
      error: `Minimum withdrawal amount is $${minWithdrawal}`
    });
  }

  const transactionId = `wth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Utiliser une transaction pour créer la transaction et mettre à jour le solde
  await prisma.$transaction(async (tx) => {
    // Créer la transaction
    const transaction = await tx.transaction.create({
      data: {
        userId: req.user.id,
        type: 'WITHDRAWAL',
        amount,
        status: 'PENDING', // Les retraits sont en attente de traitement
        description: `Withdrawal via ${withdrawalMethod}`,
        metadata: JSON.stringify({
          withdrawalMethod,
          accountDetails,
          transactionId,
          requestedAt: new Date().toISOString()
        })
      }
    });

    // Mettre à jour le solde de l'utilisateur
    await tx.user.update({
      where: { id: req.user.id },
      data: {
        real_balance: {
          decrement: amount
        }
      }
    });

    // Créer une notification
    await tx.notification.create({
      data: {
        userId: req.user.id,
        type: 'PAYMENT',
        title: 'Demande de retrait',
        message: `Votre demande de retrait de $${amount} a été soumise`,
        metadata: JSON.stringify({
          transactionId: transaction.id,
          amount
        })
      }
    });
  });

  // Récupérer le nouveau solde
  const updatedUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { real_balance: true, virtual_balance: true }
  });

  res.json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    data: {
      amount,
      newRealBalance: updatedUser.real_balance,
      newVirtualBalance: updatedUser.virtual_balance,
      transactionId,
      status: 'PENDING'
    }
  });
}));

// Obtenir l'historique des transactions
router.get('/transactions', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  
  if (type) where.type = type;
  if (status) where.status = status;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

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

// Obtenir les statistiques des paiements
router.get('/stats', asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  
  // Calculer la date de début
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date(0);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const [deposits, withdrawals, gameTransactions] = await Promise.all([
    // Statistiques des dépôts
    prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { amount: true }
    }),
    
    // Statistiques des retraits
    prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'WITHDRAWAL',
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { amount: true }
    }),
    
    // Statistiques des transactions de jeux
    prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId: req.user.id,
        type: { in: ['GAME_WIN', 'GAME_LOSS'] },
        createdAt: { gte: startDate }
      },
      _count: { type: true },
      _sum: { amount: true }
    })
  ]);

  const totalDeposits = deposits._sum.amount || 0;
  const totalWithdrawals = withdrawals._sum.amount || 0;
  const totalGames = gameTransactions.reduce((sum, t) => sum + t._count.type, 0);
  const totalGameWins = gameTransactions.find(t => t.type === 'GAME_WIN')?._sum.amount || 0;
  const totalGameLosses = gameTransactions.find(t => t.type === 'GAME_LOSS')?._sum.amount || 0;
  const netGaming = totalGameWins - totalGameLosses;

  res.json({
    success: true,
    data: {
      timeRange,
      deposits: {
        count: deposits._count.id || 0,
        total: totalDeposits
      },
      withdrawals: {
        count: withdrawals._count.id || 0,
        total: totalWithdrawals
      },
      gaming: {
        totalGames,
        totalWins: totalGameWins,
        totalLosses: totalGameLosses,
        netGaming
      },
      summary: {
        totalDeposits,
        totalWithdrawals,
        netGaming,
        netPosition: totalDeposits - totalWithdrawals + netGaming
      }
    }
  });
}));

// Obtenir les méthodes de paiement disponibles
router.get('/methods', asyncHandler(async (req, res) => {
  const paymentMethods = [
    {
      id: 'credit_card',
      name: 'Carte de crédit',
      type: 'deposit',
      minAmount: 5,
      maxAmount: 1000,
      processingTime: 'Instant',
      fees: '2.5%'
    },
    {
      id: 'bank_transfer',
      name: 'Virement bancaire',
      type: 'both',
      minAmount: 20,
      maxAmount: 5000,
      processingTime: '1-3 jours',
      fees: '0%'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      type: 'deposit',
      minAmount: 10,
      maxAmount: 2000,
      processingTime: 'Instant',
      fees: '3%'
    },
    {
      id: 'crypto',
      name: 'Cryptomonnaies',
      type: 'both',
      minAmount: 50,
      maxAmount: 10000,
      processingTime: '10-30 minutes',
      fees: '1%'
    }
  ];

  res.json({
    success: true,
    data: { paymentMethods }
  });
}));

// Route admin - Traiter un retrait
router.put('/admin/withdrawals/:id/process', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status'
    });
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      type: 'WITHDRAWAL',
      status: 'PENDING'
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          real_balance: true
        }
      }
    }
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: 'Withdrawal transaction not found'
    });
  }

  await prisma.$transaction(async (tx) => {
    // Mettre à jour le statut de la transaction
    await tx.transaction.update({
      where: { id },
      data: {
        status,
        metadata: {
          ...transaction.metadata,
          processedAt: new Date().toISOString(),
          adminNotes,
          processedBy: req.user.id
        }
      }
    });

    // Si le retrait a échoué, rembourser le solde
    if (status === 'FAILED' || status === 'CANCELLED') {
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          real_balance: {
            increment: transaction.amount
          }
        }
      });
    }

    // Créer une notification
    const statusMessages = {
      'COMPLETED': 'Votre retrait a été traité avec succès',
      'FAILED': 'Votre retrait a échoué et a été remboursé',
      'CANCELLED': 'Votre retrait a été annulé et remboursé'
    };

    await tx.notification.create({
      data: {
        userId: transaction.userId,
        type: 'PAYMENT',
        title: 'Retrait traité',
        message: statusMessages[status],
        metadata: JSON.stringify({
          transactionId: transaction.id,
          amount: transaction.amount,
          status
        })
      }
    });
  });

  res.json({
    success: true,
    message: `Withdrawal ${status.toLowerCase()} successfully`
  });
}));

// Route admin - Obtenir tous les retraits en attente
router.get('/admin/withdrawals/pending', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            real_balance: true
          }
        }
      }
    }),
    prisma.transaction.count({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING'
      }
    })
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

// Obtenir toutes les transactions (admin seulement)
router.get('/transactions', asyncHandler(async (req, res) => {
  const transactions = await prisma.transaction.findMany({
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
    take: 100
  });

  res.json({
    success: true,
    data: { transactions }
  });
}));

// Add virtual deposit endpoint
router.post('/virtual-deposit', asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { virtual_balance: { increment: amount } },
    select: { virtual_balance: true }
  });
  res.json({ success: true, data: { virtual_balance: user.virtual_balance } });
}));

// Virtual reset endpoint (retabli balans virtual coins a 10,000)
router.post('/virtual-reset', asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { virtual_balance: 10000 },
    select: { virtual_balance: true }
  });
  res.json({ success: true, data: { virtual_balance: user.virtual_balance } });
}));

// Virtual reset endpoint has been removed to prevent automatic money addition
// Users should only get virtual coins through admin actions or game rewards

// Payout endpoint for game services (Diamond Hunt, etc)
router.post('/payout', asyncHandler(async (req, res) => {
  const { winnerId, stake, walletMode } = req.body;
  if (!winnerId || !stake || !walletMode) {
    return res.status(400).json({ success: false, error: 'winnerId, stake, and walletMode are required' });
  }
  try {
    await prisma.$transaction(async (tx) => {
      await payoutWinnings(tx, winnerId, stake, walletMode);
    });
    res.json({ success: true, message: 'Payout processed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}));

module.exports = router; 
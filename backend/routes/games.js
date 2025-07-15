const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const matchmakingService = require('../services/matchmakingService');
const requireAdmin = require('../middleware/auth').requireAdmin;
const { payoutWinnings } = require('../services/walletService');

const router = express.Router();
const prisma = new PrismaClient();

// Get Redis and rate limiters from app
function getRedis(req) { return req.app.get('redis'); }
function getMatchmakingLimiter(req) { return req.app.get('matchmakingLimiter'); }
function getGameActionLimiter(req) { return req.app.get('gameActionLimiter'); }

// Obtenir les statistiques des jeux (only real money games for admin tracking)
router.get('/stats', asyncHandler(async (req, res) => {
  const { timeRange = '7d', matchType = 'real' } = req.query;
  
  // Calculer la date de début selon la période
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
    // Statistiques par type de jeu
    prisma.gameResult.groupBy({
      by: ['gameType', 'result'],
      where: {
        userId: req.user.id,
        matchType: matchType,
        createdAt: { gte: startDate }
      },
      _count: { result: true },
      _sum: { betAmount: true, winAmount: true }
    }),
    
    // Statistiques globales
    prisma.gameResult.aggregate({
      where: {
        userId: req.user.id,
        matchType: matchType,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { betAmount: true, winAmount: true }
    })
  ]);

  // Organiser les statistiques par jeu
  const gameStatsMap = {};
  gameStats.forEach(stat => {
    if (!gameStatsMap[stat.gameType]) {
      gameStatsMap[stat.gameType] = {
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalBets: 0,
        totalWins: 0,
        winRate: 0
      };
    }
    
    gameStatsMap[stat.gameType].total += stat._count.result;
    gameStatsMap[stat.gameType].totalBets += stat._sum.betAmount || 0;
    
    if (stat.result === 'WIN') {
      gameStatsMap[stat.gameType].wins = stat._count.result;
      gameStatsMap[stat.gameType].totalWins += stat._sum.winAmount || 0;
    } else if (stat.result === 'LOSS') {
      gameStatsMap[stat.gameType].losses = stat._count.result;
    } else if (stat.result === 'DRAW') {
      gameStatsMap[stat.gameType].draws = stat._count.result;
    }
  });

  // Calculer les taux de gain
  Object.keys(gameStatsMap).forEach(gameType => {
    const stats = gameStatsMap[gameType];
    stats.winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
  });

  const totalGames = totalStats._count.id || 0;
  const totalBets = totalStats._sum.betAmount || 0;
  const totalWins = totalStats._sum.winAmount || 0;
  const overallWinRate = totalGames > 0 ? (gameStats.find(s => s.result === 'WIN')?._count.result || 0) / totalGames * 100 : 0;

  res.json({
    success: true,
    data: {
      timeRange,
      matchType,
      games: gameStatsMap,
      overall: {
        totalGames,
        totalBets,
        totalWins,
        winRate: Math.round(overallWinRate * 100) / 100
      }
    }
  });
}));

// Jouer à un jeu (single player games)
router.post('/play', asyncHandler(async (req, res) => {
  const { gameType, betAmount, gameData, matchType = 'real' } = req.body;
  if (!gameType || !betAmount || betAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Game type and valid bet amount are required'
    });
  }

  // Vérifier le solde de l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { real_balance: true, virtual_balance: true }
  });

  const userBalance = matchType === 'real' ? user.real_balance : user.virtual_balance;
  if (userBalance < betAmount) {
    return res.status(400).json({
      success: false,
      error: `Insufficient ${matchType} balance`
    });
  }

  // Simuler le résultat du jeu (same logic for both real and virtual)
  const gameResult = simulateGame(gameType, gameData);
  
  // Calculer les gains (same calculation for both)
  const winAmount = gameResult.result === 'WIN' ? betAmount * gameResult.multiplier : 0;
  const finalBalance = userBalance - betAmount + winAmount;

  // Utiliser une transaction pour mettre à jour le solde et enregistrer le résultat
  await prisma.$transaction(async (tx) => {
    // Mettre à jour le solde de l'utilisateur
    await tx.user.update({
      where: { id: req.user.id },
      data: matchType === 'real' ? { real_balance: finalBalance } : { virtual_balance: finalBalance }
    });

    // Enregistrer le résultat du jeu
    const gameResultRecord = await tx.gameResult.create({
      data: {
        userId: req.user.id,
        gameType,
        betAmount,
        winAmount,
        matchType,
        result: gameResult.result,
        metadata: JSON.stringify({
          gameData,
          gameResult: gameResult.details,
          multiplier: gameResult.multiplier
        })
      }
    });

    // Créer une transaction pour le pari (only for real money)
    if (matchType === 'real') {
      await tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'GAME_BET',
          amount: betAmount,
          status: 'COMPLETED',
          description: `Bet on ${gameType}`,
          metadata: JSON.stringify({
            gameResultId: gameResultRecord.id,
            gameType,
            matchType
          })
        }
      });

      // Si l'utilisateur a gagné, créer une transaction pour les gains
      if (winAmount > 0) {
        await tx.transaction.create({
          data: {
            userId: req.user.id,
            type: 'GAME_WIN',
            amount: winAmount,
            status: 'COMPLETED',
            description: `Won ${gameType}`,
            metadata: JSON.stringify({
              gameResultId: gameResultRecord.id,
              gameType,
              matchType
            })
          }
        });
      }
    }
  });

  res.json({
    success: true,
    message: 'Game played successfully',
    data: {
      result: gameResult.result,
      betAmount,
      winAmount,
      newBalance: finalBalance,
      gameDetails: gameResult.details,
      matchType
    }
  });
}));

// Obtenir l'historique des jeux
router.get('/history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, gameType, result, matchType } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  if (gameType) where.gameType = gameType;
  if (result) where.result = result;
  if (matchType) where.matchType = matchType;

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
        matchType: true,
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

// Obtenir les classements (only real money games for admin tracking)
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { gameType, timeRange = '7d', limit = 10 } = req.query;
  const matchType = 'real'; // Always use real data
  // Calculer la date de début
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
    case 'all':
      startDate = new Date(0);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const where = {
    matchType: matchType,
    createdAt: { gte: startDate }
  };
  if (gameType) where.gameType = gameType;

  // Obtenir les meilleurs joueurs par gains totaux
  const topWinners = await prisma.gameResult.groupBy({
    by: ['userId'],
    where: {
      ...where,
      result: 'WIN'
    },
    _sum: { winAmount: true },
    _count: { id: true },
    orderBy: {
      _sum: {
        winAmount: 'desc'
      }
    },
    take: parseInt(limit)
  });

  // Obtenir les détails des utilisateurs
  const userIds = topWinners.map(w => w.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      avatar: true
    }
  });

  const leaderboard = topWinners.map((winner, index) => {
    const user = users.find(u => u.id === winner.userId);
    return {
      rank: index + 1,
      userId: winner.userId,
      username: user?.username || 'Unknown',
      avatar: user?.avatar,
      totalWins: winner._sum.winAmount || 0,
      gamesWon: winner._count.id
    };
  });

  res.json({
    success: true,
    data: {
      leaderboard,
      gameType: gameType || 'all',
      timeRange,
      matchType
    }
  });
}));

// Public endpoint: Get all active games
router.get('/active', asyncHandler(async (req, res) => {
  const games = await prisma.game.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      minBet: true,
      maxBet: true,
      players: true,
      isActive: true,
    },
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, data: games });
}));

// --- Real-Time Matchmaking ---
router.post('/matchmaking/join', (req, res, next) => req.app.get('matchmakingLimiter')(req, res, next), asyncHandler(async (req, res) => {
  const { gameType, stakeAmount, matchType = 'real' } = req.body;
  const userId = req.user.id;
  const username = req.user.username;
  const io = req.app.get('io');
  const userSockets = req.app.get('userSockets');

  // Validate input
  if (!gameType || !stakeAmount || stakeAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Game type and valid stake amount are required'
    });
  }

  // Validate game type
  const validGameTypes = ['connect_four', 'tic_tac_toe', 'dice_battle', 'diamond_hunt'];
  if (!validGameTypes.includes(gameType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid game type'
    });
  }

  try {
    // Add user to matchmaking queue
    const result = await matchmakingService.addToQueue(userId, username, gameType, stakeAmount, matchType);
    
    if (result.matchFound) {
      // Match found! Notify both players via WebSocket
      const [player1Socket, player2Socket] = [
        userSockets.get(userId),
        userSockets.get(result.opponentId)
      ];

      const matchData = {
        matchId: result.matchId,
        gameType: result.gameType,
        stakeAmount: result.stakeAmount,
        matchType: result.matchType,
        opponentId: result.opponentId
      };

      // Notify both players
      if (player1Socket) {
        player1Socket.emit('matchFound', { ...matchData, opponentId: result.opponentId });
      }
      if (player2Socket) {
        player2Socket.emit('matchFound', { ...matchData, opponentId: userId });
      }

      res.json({
        success: true,
        matchFound: true,
        matchId: result.matchId,
        message: 'Match found!'
      });
    } else {
      // User added to queue, waiting for opponent
      res.json({
        success: true,
        matchFound: false,
        message: 'Added to matchmaking queue'
      });
    }
  } catch (error) {
    console.error('Matchmaking error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Matchmaking failed'
    });
  }
}));

router.get('/matchmaking/status', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const status = matchmakingService.getQueueStatus(userId);
  
  if (!status) {
    return res.json({
      success: true,
      inQueue: false,
      matchId: null,
      matchStatus: null
    });
  }

  res.json({
    success: true,
    inQueue: true,
    gameType: status.gameType,
    stakeAmount: status.stakeAmount,
    matchType: status.matchType,
    position: status.position,
    totalWaiting: status.totalWaiting,
    joinedAt: status.joinedAt
  });
}));

router.post('/matchmaking/leave', (req, res, next) => req.app.get('matchmakingLimiter')(req, res, next), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const removed = matchmakingService.removeFromQueue(userId);
  
  res.json({
    success: true,
    message: removed ? 'Left matchmaking queue' : 'Not in queue'
  });
}));

// Get matchmaking statistics (for admin)
router.get('/matchmaking/stats', asyncHandler(async (req, res) => {
  const stats = matchmakingService.getQueueStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

// --- Game Moves ---
router.post('/match/:matchId/move', (req, res, next) => req.app.get('gameActionLimiter')(req, res, next), asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { moveData } = req.body;
  const userId = req.user.id;
  const io = req.app.get('io');
  const userSockets = req.app.get('userSockets');
  const PLATFORM_FEE_PERCENT = process.env.PLATFORM_FEE_PERCENT ? parseInt(process.env.PLATFORM_FEE_PERCENT) : 10;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'active') return res.status(404).json({ success: false, error: 'Match not found or not active' });

  // Validate move and update state
  const { valid, newState, winnerId, error } = validateAndApplyMove(match.gameType, match.gameState, moveData, userId, match);

  if (!valid) return res.status(400).json({ success: false, error });

  // Save move and update match state
  await prisma.$transaction(async (tx) => {
    await tx.gameMove.create({ data: { matchId, userId, moveData: typeof moveData === 'string' ? moveData : JSON.stringify(moveData) } });
    await tx.match.update({
      where: { id: matchId },
      data: {
        gameState: newState,
        ...(winnerId ? { status: 'completed', winnerId, completedAt: new Date() } : {})
      }
    });
    
    // Log move
    await tx.auditLog.create({ data: { userId, action: 'GAME_MOVE', details: JSON.stringify({ matchId, moveData }) } });
    
    // If match ended, payout winner and fee
    if (winnerId !== null && winnerId !== undefined) {
      const matchRecord = await tx.match.findUnique({ where: { id: matchId } });
      // Use payoutWinnings for all wallet types, pass tx
      await payoutWinnings(tx, winnerId, matchRecord.betAmount, matchRecord.matchType);
      // Log audit
      await tx.auditLog.create({ data: { userId: winnerId, action: 'PAYOUT_WIN', details: JSON.stringify({ matchId, winnerAmount: Math.floor(matchRecord.betAmount * 2 * 0.9), platformFee: Math.ceil(matchRecord.betAmount * 2 * 0.1), matchType: matchRecord.matchType, platformFeePercent: 10 }) } });
      // Only create transaction records for real money (already handled in payoutWinnings)
      if (matchRecord.matchType === 'real') {
        await tx.auditLog.create({ data: { userId: null, action: 'PLATFORM_FEE', details: JSON.stringify({ matchId, platformFee: Math.ceil(matchRecord.betAmount * 2 * 0.1), platformFeePercent: 10 }) } });
      }
      
      // Suspicious activity: fast win (under 10 seconds) - only for real money
      if (matchRecord.matchType === 'real' && matchRecord.startedAt && (new Date() - new Date(matchRecord.startedAt)) < 10000) {
        await tx.auditLog.create({ data: { userId: winnerId, action: 'SUSPICIOUS_FAST_WIN', details: JSON.stringify({ matchId, durationMs: new Date() - new Date(matchRecord.startedAt) }) } });
        console.warn(`[ALERT] Suspicious fast win detected for match ${matchId}`);
        // Increment Prometheus counter
        const suspiciousActivityCounter = req.app.get('suspiciousActivityCounter');
        if (suspiciousActivityCounter) suspiciousActivityCounter.inc();
      }
      
      // Advanced anti-collusion logic - only for real money
      if (matchRecord.matchType === 'real') {
        const redis = req.app.get('redis');
        const player1Id = matchRecord.player1Id;
        const player2Id = matchRecord.player2Id;
        const now = Date.now();
        // Track match history for both players
        await redis.zadd(`user:${player1Id}:opponents`, now, player2Id);
        await redis.zadd(`user:${player2Id}:opponents`, now, player1Id);
        // Count recent matches between these two users (last 24h)
        const since = now - 24*60*60*1000;
        const p1Matches = await redis.zcount(`user:${player1Id}:opponents`, since, now);
        const p2Matches = await redis.zcount(`user:${player2Id}:opponents`, since, now);
        if (p1Matches > 5 || p2Matches > 5) {
          await tx.auditLog.create({
            data: {
              userId: player1Id,
              action: 'SUSPICIOUS_COLLAB',
              details: JSON.stringify({ matchId, opponent: player2Id, matches24h: p1Matches })
            }
          });
          await tx.auditLog.create({
            data: {
              userId: player2Id,
              action: 'SUSPICIOUS_COLLAB',
              details: JSON.stringify({ matchId, opponent: player1Id, matches24h: p2Matches })
            }
          });
          // Optionally: alert admins or lock accounts for review
          console.warn(`[ALERT] Possible collusion: ${player1Id} and ${player2Id} played ${Math.max(p1Matches, p2Matches)} times in 24h`);
          // Increment Prometheus counter
          const suspiciousActivityCounter = req.app.get('suspiciousActivityCounter');
          if (suspiciousActivityCounter) suspiciousActivityCounter.inc();
        }
      }
    }
  });

  // Emit moveMade event to both players (for board update)
  const player1Socket = userSockets.get(match.player1Id);
  const player2Socket = userSockets.get(match.player2Id);
  const movePayload = { matchId, move: moveData, gameType: match.gameType, board: newState, opponentId: userId };
  if (player1Socket) player1Socket.emit('moveMade', movePayload);
  if (player2Socket) player2Socket.emit('moveMade', movePayload);

  // Determine next turn (if game not ended)
  let nextTurnId = null;
  if (winnerId === null || winnerId === undefined) {
    // For TicTacToe and ConnectFour, turn alternates
    if (newState.turnIndex !== undefined && newState.players) {
      nextTurnId = newState.players[newState.turnIndex];
    } else if (newState.currentPlayer) {
      nextTurnId = newState.currentPlayer;
    }
  }

  // Emit yourTurn to the next player
  if (nextTurnId && userSockets.get(nextTurnId)) {
    userSockets.get(nextTurnId).emit('yourTurn', { ...movePayload, yourTurn: true });
  }

  // If match ended, emit matchEnded to both
  if (winnerId !== null && winnerId !== undefined) {
    [match.player1Id, match.player2Id].forEach(uid => {
      const sock = userSockets.get(uid);
      if (sock) sock.emit('matchEnded', { matchId, winnerId });
    });
  }

  res.json({ success: true, winnerId: winnerId || null, newState });
}));

// --- Refund on Cancelled Match (add as needed) ---
router.post('/match/:matchId/cancel', asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'active') return res.status(404).json({ success: false, error: 'Match not found or not active' });
  
  // Only allow cancel if both players agree or timeout (implement logic as needed)
  await prisma.$transaction(async (tx) => {
    await tx.match.update({ where: { id: matchId }, data: { status: 'cancelled', completedAt: new Date() } });
    
    // Refund both players based on match type
    const balanceField = match.matchType === 'real' ? 'real_balance' : 'virtual_balance';
    await tx.user.update({ where: { id: match.player1Id }, data: { [balanceField]: { increment: match.betAmount } } });
    await tx.user.update({ where: { id: match.player2Id }, data: { [balanceField]: { increment: match.betAmount } } });
    
    await tx.auditLog.create({ data: { userId: match.player1Id, action: 'ESCROW_REFUND', details: { matchId, amount: match.betAmount, matchType: match.matchType } } });
    await tx.auditLog.create({ data: { userId: match.player2Id, action: 'ESCROW_REFUND', details: { matchId, amount: match.betAmount, matchType: match.matchType } } });
    
    // Only create transaction records for real money
    if (match.matchType === 'real') {
      await tx.transaction.create({ 
        data: { 
          userId: match.player1Id, 
          type: 'REFUND', 
          amount: match.betAmount, 
          status: 'COMPLETED', 
          description: `Refund for cancelled match ${matchId}`, 
          metadata: JSON.stringify({ matchId, matchType: 'real' }) 
        } 
      });
      await tx.transaction.create({ 
        data: { 
          userId: match.player2Id, 
          type: 'REFUND', 
          amount: match.betAmount, 
          status: 'COMPLETED', 
          description: `Refund for cancelled match ${matchId}`, 
          metadata: JSON.stringify({ matchId, matchType: 'real' }) 
        } 
      });
      
      // Suspicious activity: repeated aborts - only for real money
      const aborts = await tx.auditLog.count({ where: { userId, action: 'ESCROW_REFUND', createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } });
      if (aborts > 3) {
        await tx.auditLog.create({ data: { userId, action: 'SUSPICIOUS_ABORTS', details: { matchId, aborts24h: aborts } } });
        console.warn(`[ALERT] User ${userId} has aborted ${aborts} matches in 24h.`);
        // Increment Prometheus counter
        const suspiciousActivityCounter = req.app.get('suspiciousActivityCounter');
        if (suspiciousActivityCounter) suspiciousActivityCounter.inc();
      }
    }
  });
  res.json({ success: true, message: 'Match cancelled and bets refunded.' });
}));

// --- 1v1 Player Search & Invite System ---
// Helper: Invite status tracking (in-memory for now, can be moved to DB)
const inviteStatusMap = new Map(); // inviteKey -> { status, createdAt, fromUserId, toUserId, gameType, betAmount, matchType }

// Send 1v1 invite (production-ready)
router.post('/invite', asyncHandler(async (req, res) => {
  const { toUserId, gameType, betAmount, matchType = 'real' } = req.body;
  const fromUserId = req.user.id;
  const redis = req.app.get('redis');
  if (!toUserId || !gameType || !betAmount) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (toUserId === fromUserId) {
    return res.status(400).json({ success: false, error: 'Cannot invite yourself' });
  }
  // Prevent duplicate invites
  const inviteKey = `invite:${toUserId}:${fromUserId}:${gameType}:${matchType}`;
  let existing;
  try {
    existing = await redis.get(inviteKey);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Redis error', details: err.message });
  }
  if (existing) {
    return res.status(409).json({ success: false, error: 'Invite already sent and pending' });
  }
  // Check both users exist and are friends
  const [fromUser, toUser, friendship] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId } }),
    prisma.user.findUnique({ where: { id: toUserId } }),
    prisma.friendship.findFirst({ where: { userId: fromUserId, friendId: toUserId } })
  ]);
  if (!fromUser || !toUser || !friendship) {
    return res.status(404).json({ success: false, error: 'Invalid friend' });
  }
  // Check balance for inviter
  const inviterBalance = matchType === 'real' ? fromUser.real_balance : fromUser.virtual_balance;
  if (inviterBalance < betAmount) {
    return res.status(400).json({ success: false, error: `Insufficient ${matchType} balance` });
  }
  // Store invite in Redis (expires in 5 minutes)
  try {
    await redis.set(inviteKey, JSON.stringify({ fromUserId, toUserId, gameType, betAmount, matchType }), 'EX', 300);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Redis error', details: err.message });
  }
  inviteStatusMap.set(inviteKey, { status: 'pending', createdAt: Date.now(), fromUserId, toUserId, gameType, betAmount, matchType });
  // Log invite
  await prisma.auditLog.create({ data: { userId: fromUserId, action: 'INVITE_SENT', details: { toUserId, gameType, betAmount, matchType } } });
  // Notify invited user
  const userSockets = req.app.get('userSockets');
  const sock = userSockets.get(toUserId);
  if (sock) sock.emit('invite:received', { fromUserId, gameType, betAmount, matchType });
  res.json({ success: true, message: 'Invite sent' });
}));

// Accept 1v1 invite (production-ready)
router.post('/invite/accept', asyncHandler(async (req, res) => {
  const { fromUserId, gameType, matchType = 'real' } = req.body;
  const toUserId = req.user.id;
  const redis = req.app.get('redis');
  const inviteKey = `invite:${toUserId}:${fromUserId}:${gameType}:${matchType}`;
  const invite = await redis.get(inviteKey);
  if (!invite) return res.status(404).json({ success: false, error: 'Invite not found or expired' });
  const { betAmount } = JSON.parse(invite);
  // Remove invite
  await redis.del(inviteKey);
  inviteStatusMap.set(inviteKey, { ...inviteStatusMap.get(inviteKey), status: 'accepted' });
  // Check both balances
  const [p1, p2] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId } }),
    prisma.user.findUnique({ where: { id: toUserId } })
  ]);
  const p1Balance = matchType === 'real' ? p1.real_balance : p1.virtual_balance;
  const p2Balance = matchType === 'real' ? p2.real_balance : p2.virtual_balance;
  if (p1Balance < betAmount || p2Balance < betAmount) {
    return res.status(400).json({ success: false, error: 'One or both players have insufficient balance' });
  }
  // Deduct from both
  if (matchType === 'real') {
    await prisma.user.update({ where: { id: fromUserId }, data: { real_balance: { decrement: betAmount } } });
    await prisma.user.update({ where: { id: toUserId }, data: { real_balance: { decrement: betAmount } } });
  } else {
    await prisma.user.update({ where: { id: fromUserId }, data: { virtual_balance: { decrement: betAmount } } });
    await prisma.user.update({ where: { id: toUserId }, data: { virtual_balance: { decrement: betAmount } } });
  }
  // Log audit
  await prisma.auditLog.create({ data: { userId: fromUserId, action: 'ESCROW_DEBIT', details: { matchType: gameType, betAmount, currency: matchType } } });
  await prisma.auditLog.create({ data: { userId: toUserId, action: 'ESCROW_DEBIT', details: { matchType: gameType, betAmount, currency: matchType } } });
  // Create match
  const initialState = getInitialGameState(gameType, [fromUserId, toUserId]);
  const match = await prisma.match.create({
    data: {
      gameType,
      player1Id: fromUserId,
      player2Id: toUserId,
      betAmount,
      status: 'active',
      startedAt: new Date(),
      gameState: initialState,
      escrow: betAmount * 2,
      matchType
    }
  });
  // Log match creation
  await prisma.auditLog.create({ data: { userId: null, action: 'MATCH_CREATED', details: { matchId: match.id, gameType, betAmount, player1Id: fromUserId, player2Id: toUserId, matchType } } });
  // Notify both users
  const userSockets = req.app.get('userSockets');
  [fromUserId, toUserId].forEach(uid => {
    const sock = userSockets.get(uid);
    if (sock) sock.emit('matchFound', { matchId: match.id, gameType, betAmount, matchType });
  });
  res.json({ success: true, matchId: match.id, message: 'Match created by invite!' });
}));

// Decline 1v1 invite (production-ready)
router.post('/invite/decline', asyncHandler(async (req, res) => {
  const { fromUserId, gameType, matchType = 'real' } = req.body;
  const toUserId = req.user.id;
  const redis = req.app.get('redis');
  const inviteKey = `invite:${toUserId}:${fromUserId}:${gameType}:${matchType}`;
  await redis.del(inviteKey);
  inviteStatusMap.set(inviteKey, { ...inviteStatusMap.get(inviteKey), status: 'declined' });
  // Optionally: notify inviter
  const userSockets = req.app.get('userSockets');
  const sock = userSockets.get(fromUserId);
  if (sock) sock.emit('inviteDeclined', { toUserId, gameType, matchType });
  // Log audit
  await prisma.auditLog.create({ data: { userId: toUserId, action: 'INVITE_DECLINED', details: { fromUserId, gameType, matchType } } });
  res.json({ success: true, message: 'Invite declined' });
}));

// Admin: List all invites
router.get('/admin/invites', requireAdmin, asyncHandler(async (req, res) => {
  // For now, return all in-memory invites (can be moved to DB for persistence)
  const invites = Array.from(inviteStatusMap.entries()).map(([key, value]) => ({ key, ...value }));
  res.json({ success: true, data: invites });
}));

// Admin: Cancel/refund invite
router.post('/admin/invite/cancel', requireAdmin, asyncHandler(async (req, res) => {
  const { inviteKey } = req.body;
  const invite = inviteStatusMap.get(inviteKey);
  if (!invite || invite.status !== 'pending') {
    return res.status(404).json({ success: false, error: 'Invite not found or not pending' });
  }
  // Refund inviter if needed (only if not yet accepted)
  // (Assume funds are only deducted on accept, so no refund needed here)
  inviteStatusMap.set(inviteKey, { ...invite, status: 'cancelled' });
  // Remove from Redis
  const redis = req.app.get('redis');
  await redis.del(inviteKey);
  // Log audit
  await prisma.auditLog.create({ data: { userId: null, action: 'INVITE_CANCELLED', details: { inviteKey } } });
  res.json({ success: true, message: 'Invite cancelled' });
}));

// Create match and deduct stakes for both players
router.post('/api/match/create', asyncHandler(async (req, res) => {
  const { matchId, player1, player2, stake, walletMode } = req.body;
  if (!matchId || !player1 || !player2 || !stake || !walletMode) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }
  try {
    // Use matchmakingService to create match and deduct stakes
    const match = await matchmakingService.createMatch(player1, player2, 'custom', stake, walletMode, matchId);
    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}));

// --- Helpers for Game Logic ---

function getInitialGameState(gameType, playerIds) {
  switch (gameType) {
    case 'CHESS':
      return { 
        board: initializeChessBoard(), 
        turnIndex: 0, 
        players: playerIds,
        moveHistory: [],
        capturedPieces: []
      };
    case 'TIC_TAC_TOE':
      return { board: Array(9).fill(null), turnIndex: 0, players: playerIds };
    case 'TIC_TAC_TOE_5X5':
    case 'tic_tac_toe_5x5':
    case 'tictactoe5x5':
      return { board: Array(25).fill(null), turnIndex: 0, players: playerIds };
    case 'CONNECT_FOUR':
      return { board: Array(6).fill().map(() => Array(7).fill(null)), turnIndex: 0, players: playerIds };
    case 'dice_battle':
      return { 
        round: 1, 
        scores: {}, 
        dice: {},
        roundScores: {},
        players: playerIds, 
        turn: playerIds[0],
        gameOver: false,
        roundComplete: false
      };
    case 'diamond_hunt':
      return { diamonds: [false, false, false, false, false], found: {}, players: playerIds, turn: playerIds[0] };
    default:
      throw new Error('Unknown game type');
  }
}

function validateAndApplyMove(gameType, state, move, userId, match) {
  switch (gameType) {
    case 'CHESS':
      return chessMove(state, move, userId, match);
    case 'TIC_TAC_TOE':
      return ticTacToeMove(state, move, userId, match);
    case 'TIC_TAC_TOE_5X5':
    case 'tic_tac_toe_5x5':
    case 'tictactoe5x5':
      return ticTacToe5x5Move(state, move, userId, match);
    case 'CONNECT_FOUR':
      return connectFourMove(state, move, userId, match);
    case 'dice_battle':
      return diceBattleMove(state, move, userId, match);
    case 'diamond_hunt':
      return diamondHuntMove(state, move, userId, match);
    default:
      return { valid: false, error: 'Unknown game type' };
  }
}

// --- Game Logic Implementations ---

function ticTacToeMove(state, move, userId, match) {
  const { index } = move;
  if (state.players[state.turnIndex] !== userId) return { valid: false, error: 'Not your turn' };
  if (state.board[index] !== null) return { valid: false, error: 'Cell already taken' };
  const symbol = state.turnIndex === 0 ? 'X' : 'O';
  const newBoard = [...state.board];
  newBoard[index] = symbol;
  const nextTurnIndex = 1 - state.turnIndex;
  const newState = { ...state, board: newBoard, turnIndex: nextTurnIndex };
  const winner = checkTicTacToeWinner(newBoard);
  if (winner) return { valid: true, newState, winnerId: winner === 'X' ? state.players[0] : state.players[1] };
  if (newBoard.every(cell => cell !== null)) return { valid: true, newState, winnerId: null }; // Draw
  return { valid: true, newState, winnerId: null };
}

function checkTicTacToeWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function connectFourMove(state, move, userId, match) {
  const { column } = move;
  if (state.players[state.turnIndex] !== userId) return { valid: false, error: 'Not your turn' };
  if (column < 0 || column > 6) return { valid: false, error: 'Invalid column' };
  const board = state.board.map(row => [...row]);
  let placed = false;
  for (let row = 5; row >= 0; row--) {
    if (!board[row][column]) {
      board[row][column] = state.turnIndex === 0 ? 'R' : 'Y';
      placed = true;
      break;
    }
  }
  if (!placed) return { valid: false, error: 'Column full' };
  const nextTurnIndex = 1 - state.turnIndex;
  const newState = { ...state, board, turnIndex: nextTurnIndex };
  const winner = checkConnectFourWinner(board);
  if (winner) return { valid: true, newState, winnerId: winner === 'R' ? state.players[0] : state.players[1] };
  if (board.every(row => row.every(cell => cell))) return { valid: true, newState, winnerId: null }; // Draw
  return { valid: true, newState, winnerId: null };
}

function checkConnectFourWinner(board) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      if (c <= 3 && [1,2,3].every(i => board[r][c+i] === cell)) return cell;
      if (r <= 2 && [1,2,3].every(i => board[r+i][c] === cell)) return cell;
      if (c <= 3 && r <= 2 && [1,2,3].every(i => board[r+i][c+i] === cell)) return cell;
      if (c >= 3 && r <= 2 && [1,2,3].every(i => board[r+i][c-i] === cell)) return cell;
    }
  }
  return null;
}

function diceBattleMove(state, move, userId, match) {
  console.log('🎲 Dice Battle Move:', { state, move, userId });
  
  // Check if player already rolled this round
  if (state.scores[userId]) {
    return { valid: false, error: 'Already rolled this round' };
  }
  
  // Get dice values from the move
  const dice = move.dice || [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
  const total = dice.reduce((sum, die) => sum + die, 0);
  
  console.log('🎲 Player dice:', dice, 'Total:', total);
  
  // Store the dice values and total for this player
  const newScores = { ...state.scores, [userId]: total };
  const newDice = { ...state.dice, [userId]: dice };
  
  let winnerId = null;
  let gameOver = false;
  let roundComplete = false;
  
  // Check if both players have rolled
  if (Object.keys(newScores).length === 2) {
    const [p1, p2] = state.players;
    const p1Total = newScores[p1] || 0;
    const p2Total = newScores[p2] || 0;
    
    console.log('🎲 Round results:', { p1: p1Total, p2: p2Total });
    
    // Determine round winner
    if (p1Total > p2Total) {
      winnerId = p1;
    } else if (p2Total > p1Total) {
      winnerId = p2;
    }
    
    roundComplete = true;
    
    // Update round scores
    const newRoundScores = { ...state.roundScores };
    if (winnerId) {
      newRoundScores[winnerId] = (newRoundScores[winnerId] || 0) + 1;
    }
    
    // Check if game is over (first to 3 wins or 5 rounds reached)
    const currentRound = state.round || 1;
    const p1Wins = newRoundScores[p1] || 0;
    const p2Wins = newRoundScores[p2] || 0;
    
    if (p1Wins >= 3 || p2Wins >= 3 || currentRound >= 5) {
      gameOver = true;
      winnerId = p1Wins > p2Wins ? p1 : p2Wins > p1Wins ? p2 : null;
    }
    
    const newState = { 
      ...state, 
      scores: newScores, 
      dice: newDice,
      roundScores: newRoundScores,
      round: currentRound + 1,
      gameOver,
      roundComplete
    };
    
    console.log('🎲 Updated state:', newState);
    
    return { 
      valid: true, 
      newState, 
      winnerId,
      roundComplete,
      gameOver,
      dice: newDice,
      scores: newRoundScores
    };
  }
  
  // Only one player has rolled so far
  const newState = { 
    ...state, 
    scores: newScores, 
    dice: newDice
  };
  
  return { 
    valid: true, 
    newState, 
    winnerId: null,
    roundComplete: false,
    gameOver: false
  };
}

function diamondHuntMove(state, move, userId, match) {
  const { pick } = move;
  if (state.found[userId]) return { valid: false, error: 'Already picked' };
  if (pick < 0 || pick > 4) return { valid: false, error: 'Invalid pick' };
  const newFound = { ...state.found, [userId]: pick };
  let winnerId = null;
  if (Object.values(newFound).includes(2)) {
    winnerId = Object.keys(newFound).find(uid => newFound[uid] === 2);
  }
  const newState = { ...state, found: newFound };
  return { valid: true, newState, winnerId };
}

// --- Chess Game Logic ---

function initializeChessBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Initialize pawns
  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6][i] = { type: 'pawn', color: 'white', hasMoved: false };
  }

  // Initialize other pieces
  const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let i = 0; i < 8; i++) {
    board[0][i] = { type: backRank[i], color: 'black', hasMoved: false };
    board[7][i] = { type: backRank[i], color: 'white', hasMoved: false };
  }

  return board;
}

function chessMove(state, move, userId, match) {
  const { from, to, promotion } = move;
  const [fromFile, fromRank] = from.split('').map(Number);
  const [toFile, toRank] = to.split('').map(Number);
  
  if (state.players[state.turnIndex] !== userId) {
    return { valid: false, error: 'Not your turn' };
  }

  const piece = state.board[fromRank][fromFile];
  if (!piece) {
    return { valid: false, error: 'No piece at source position' };
  }

  const currentColor = state.turnIndex === 0 ? 'white' : 'black';
  if (piece.color !== currentColor) {
    return { valid: false, error: 'Not your piece' };
  }

  // Validate move (simplified chess rules)
  const validMoves = getValidChessMoves(piece, fromFile, fromRank, state.board);
  if (!validMoves.some(m => m.file === toFile && m.rank === toRank)) {
    return { valid: false, error: 'Invalid move' };
  }

  // Make the move
  const newBoard = state.board.map(row => [...row]);
  const capturedPiece = newBoard[toRank][toFile];
  
  // Handle pawn promotion
  if (piece.type === 'pawn' && ((piece.color === 'white' && toRank === 0) || (piece.color === 'black' && toRank === 7))) {
    newBoard[toRank][toFile] = { 
      type: promotion || 'queen', 
      color: piece.color, 
      hasMoved: true 
    };
  } else {
    newBoard[toRank][toFile] = { ...piece, hasMoved: true };
  }
  newBoard[fromRank][fromFile] = null;

  // Update move history and captured pieces
  const newMoveHistory = [...state.moveHistory, { from, to, piece, captured: capturedPiece }];
  const newCapturedPieces = capturedPiece ? [...state.capturedPieces, capturedPiece] : state.capturedPieces;

  const nextTurnIndex = 1 - state.turnIndex;
  const newState = { 
    ...state, 
    board: newBoard, 
    turnIndex: nextTurnIndex,
    moveHistory: newMoveHistory,
    capturedPieces: newCapturedPieces
  };

  // Check for checkmate or stalemate (simplified)
  const isCheckmate = checkChessCheckmate(newBoard, nextTurnIndex === 0 ? 'black' : 'white');
  const isStalemate = checkChessStalemate(newBoard, nextTurnIndex === 0 ? 'black' : 'white');

  let winnerId = null;
  if (isCheckmate) {
    winnerId = state.players[state.turnIndex]; // Current player wins
  } else if (isStalemate) {
    winnerId = null; // Draw
  }

  return { valid: true, newState, winnerId };
}

function getValidChessMoves(piece, file, rank, board) {
  const moves = [];
  
  switch (piece.type) {
    case 'pawn':
      const direction = piece.color === 'white' ? -1 : 1;
      const startRank = piece.color === 'white' ? 6 : 1;
      
      // Forward move
      if (rank + direction >= 0 && rank + direction < 8 && !board[rank + direction][file]) {
        moves.push({ file, rank: rank + direction });
        
        // Double move from starting position
        if (rank === startRank && !board[rank + 2 * direction][file]) {
          moves.push({ file, rank: rank + 2 * direction });
        }
      }
      
      // Captures
      for (const captureFile of [file - 1, file + 1]) {
        if (captureFile >= 0 && captureFile < 8 && rank + direction >= 0 && rank + direction < 8) {
          const targetPiece = board[rank + direction][captureFile];
          if (targetPiece && targetPiece.color !== piece.color) {
            moves.push({ file: captureFile, rank: rank + direction });
          }
        }
      }
      break;
      
    case 'rook':
      // Horizontal and vertical moves
      const rookDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [df, dr] of rookDirections) {
        for (let i = 1; i < 8; i++) {
          const newFile = file + df * i;
          const newRank = rank + dr * i;
          if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
          
          const targetPiece = board[newRank][newFile];
          if (!targetPiece) {
            moves.push({ file: newFile, rank: newRank });
          } else {
            if (targetPiece.color !== piece.color) {
              moves.push({ file: newFile, rank: newRank });
            }
            break;
          }
        }
      }
      break;
      
    case 'knight':
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [df, dr] of knightMoves) {
        const newFile = file + df;
        const newRank = rank + dr;
        if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
          const targetPiece = board[newRank][newFile];
          if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
      break;
      
    case 'bishop':
      // Diagonal moves
      const bishopDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [df, dr] of bishopDirections) {
        for (let i = 1; i < 8; i++) {
          const newFile = file + df * i;
          const newRank = rank + dr * i;
          if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
          
          const targetPiece = board[newRank][newFile];
          if (!targetPiece) {
            moves.push({ file: newFile, rank: newRank });
          } else {
            if (targetPiece.color !== piece.color) {
              moves.push({ file: newFile, rank: newRank });
            }
            break;
          }
        }
      }
      break;
      
    case 'queen':
      // Combine rook and bishop moves
      const queenDirections = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [df, dr] of queenDirections) {
        for (let i = 1; i < 8; i++) {
          const newFile = file + df * i;
          const newRank = rank + dr * i;
          if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
          
          const targetPiece = board[newRank][newFile];
          if (!targetPiece) {
            moves.push({ file: newFile, rank: newRank });
          } else {
            if (targetPiece.color !== piece.color) {
              moves.push({ file: newFile, rank: newRank });
            }
            break;
          }
        }
      }
      break;
      
    case 'king':
      const kingMoves = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
      ];
      for (const [df, dr] of kingMoves) {
        const newFile = file + df;
        const newRank = rank + dr;
        if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
          const targetPiece = board[newRank][newFile];
          if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
      break;
  }
  
  return moves;
}

function checkChessCheckmate(board, color) {
  // Simplified checkmate detection - just check if king is captured
  let kingFound = false;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === 'king' && piece.color === color) {
        kingFound = true;
        break;
      }
    }
    if (kingFound) break;
  }
  return !kingFound;
}

function checkChessStalemate(board, color) {
  // Simplified stalemate detection - just check if no moves are possible
  // This is a very basic implementation
  return false;
}

// --- 5x5 TicTacToe Logic ---

function ticTacToe5x5Move(state, move, userId, match) {
  const { index } = move;
  if (state.players[state.turnIndex] !== userId) return { valid: false, error: 'Not your turn' };
  if (state.board[index] !== null) return { valid: false, error: 'Cell already taken' };
  const symbol = state.turnIndex === 0 ? 'X' : 'O';
  const newBoard = [...state.board];
  newBoard[index] = symbol;
  const nextTurnIndex = 1 - state.turnIndex;
  const newState = { ...state, board: newBoard, turnIndex: nextTurnIndex };
  const winner = checkTicTacToe5x5Winner(newBoard);
  if (winner) return { valid: true, newState, winnerId: winner === 'X' ? state.players[0] : state.players[1] };
  if (newBoard.every(cell => cell !== null)) return { valid: true, newState, winnerId: null }; // Draw
  return { valid: true, newState, winnerId: null };
}

function checkTicTacToe5x5Winner(board) {
  // Convert 1D board to 2D 5x5
  const grid = Array.from({ length: 5 }, (_, i) => board.slice(i * 5, i * 5 + 5));
  // Check rows
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j <= 1; j++) {
      const cell = grid[i][j];
      if (cell && cell === grid[i][j+1] && cell === grid[i][j+2] && cell === grid[i][j+3]) return cell;
    }
  }
  // Check columns
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i <= 1; i++) {
      const cell = grid[i][j];
      if (cell && cell === grid[i+1][j] && cell === grid[i+2][j] && cell === grid[i+3][j]) return cell;
    }
  }
  // Check diagonals (top-left to bottom-right)
  for (let i = 0; i <= 1; i++) {
    for (let j = 0; j <= 1; j++) {
      const cell = grid[i][j];
      if (cell && cell === grid[i+1][j+1] && cell === grid[i+2][j+2] && cell === grid[i+3][j+3]) return cell;
    }
  }
  // Check diagonals (top-right to bottom-left)
  for (let i = 0; i <= 1; i++) {
    for (let j = 3; j < 5; j++) {
      const cell = grid[i][j];
      if (cell && cell === grid[i+1][j-1] && cell === grid[i+2][j-2] && cell === grid[i+3][j-3]) return cell;
    }
  }
  return null;
}

// Fonction pour simuler un jeu
function simulateGame(gameType, gameData) {
  const random = Math.random();
  
  switch (gameType) {
    case 'CHESS':
      // Simulation du Chess
      if (random < 0.3) {
        return {
          result: 'WIN',
          multiplier: 2.0,
          details: { message: 'Checkmate! You won the chess game!' }
        };
      } else if (random < 0.6) {
        return {
          result: 'DRAW',
          multiplier: 1.0,
          details: { message: 'Stalemate! It\'s a draw!' }
        };
      } else {
        return {
          result: 'LOSS',
          multiplier: 0.0,
          details: { message: 'Checkmate! You lost the chess game!' }
        };
      }
      
    case 'TIC_TAC_TOE':
      // Simulation simple du Tic Tac Toe
      if (random < 0.4) {
        return {
          result: 'WIN',
          multiplier: 2.0,
          details: { message: 'You won the game!' }
        };
      } else if (random < 0.7) {
        return {
          result: 'DRAW',
          multiplier: 1.0,
          details: { message: 'It\'s a draw!' }
        };
      } else {
        return {
          result: 'LOSS',
          multiplier: 0.0,
          details: { message: 'You lost the game!' }
        };
      }
      
    case 'CONNECT_FOUR':
      // Simulation du Connect Four
      if (random < 0.35) {
        return {
          result: 'WIN',
          multiplier: 2.5,
          details: { message: 'You connected four!' }
        };
      } else if (random < 0.65) {
        return {
          result: 'DRAW',
          multiplier: 1.0,
          details: { message: 'Board is full!' }
        };
      } else {
        return {
          result: 'LOSS',
          multiplier: 0.0,
          details: { message: 'Opponent connected four!' }
        };
      }
      
    case 'dice_battle':
      // Simulation du Dice Battle
      const playerRoll = Math.floor(Math.random() * 6) + 1;
      const opponentRoll = Math.floor(Math.random() * 6) + 1;
      
      if (playerRoll > opponentRoll) {
        return {
          result: 'WIN',
          multiplier: 1.8,
          details: { 
            message: 'You won the dice battle!',
            playerRoll,
            opponentRoll
          }
        };
      } else if (playerRoll === opponentRoll) {
        return {
          result: 'DRAW',
          multiplier: 1.0,
          details: { 
            message: 'It\'s a tie!',
            playerRoll,
            opponentRoll
          }
        };
      } else {
        return {
          result: 'LOSS',
          multiplier: 0.0,
          details: { 
            message: 'You lost the dice battle!',
            playerRoll,
            opponentRoll
          }
        };
      }
      
    case 'diamond_hunt':
      // Simulation du Diamond Hunt
      const diamonds = Math.floor(random * 10);
      if (diamonds >= 7) {
        return {
          result: 'WIN',
          multiplier: 3.0,
          details: { 
            message: 'Excellent hunt!',
            diamonds
          }
        };
      } else if (diamonds >= 4) {
        return {
          result: 'WIN',
          multiplier: 1.5,
          details: { 
            message: 'Good hunt!',
            diamonds
          }
        };
      } else {
        return {
          result: 'LOSS',
          multiplier: 0.0,
          details: { 
            message: 'Poor hunt!',
            diamonds
          }
        };
      }
      
    default:
      return {
        result: 'LOSS',
        multiplier: 0.0,
        details: { message: 'Unknown game type' }
      };
  }
}

module.exports = router; 
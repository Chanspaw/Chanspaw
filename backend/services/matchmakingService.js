const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { escrowBets, payoutMatch } = require('./payoutService');
// All old stake deduction and escrow logic removed. New payout system will be implemented here.

class MatchmakingService {
  constructor() {
    this.activeQueues = new Map(); // gameType:stakeAmount:matchType -> Set of userIds
    this.userQueues = new Map(); // userId -> queue info
  }

  // Add user to matchmaking queue
  async addToQueue(userId, username, gameType, stakeAmount, matchType) {
    const queueKey = `${gameType}:${stakeAmount}:${matchType}`;
    
    // Check if user is already in any queue
    if (this.userQueues.has(userId)) {
      throw new Error('User already in queue');
    }

    // Check if there's already a matching opponent
    const existingQueue = this.activeQueues.get(queueKey);
    if (existingQueue && existingQueue.size > 0) {
      // Find an opponent
      const opponentId = Array.from(existingQueue)[0];
      existingQueue.delete(opponentId);
      
      // Remove opponent from user queues
      this.userQueues.delete(opponentId);
      
      // Create match
      const match = await this.createMatch(userId, opponentId, gameType, stakeAmount, matchType);
      
      return {
        success: true,
        matchFound: true,
        matchId: match.id,
        opponentId,
        gameType,
        stakeAmount,
        matchType
      };
    }

    // Add user to queue
    if (!this.activeQueues.has(queueKey)) {
      this.activeQueues.set(queueKey, new Set());
    }
    this.activeQueues.get(queueKey).add(userId);
    
    // Track user's queue info
    this.userQueues.set(userId, {
      queueKey,
      gameType,
      stakeAmount,
      matchType,
      joinedAt: new Date()
    });

    return {
      success: true,
      matchFound: false,
      message: 'Added to matchmaking queue'
    };
  }

  // Remove user from queue
  removeFromQueue(userId) {
    const userQueue = this.userQueues.get(userId);
    if (!userQueue) {
      return false;
    }

    const { queueKey } = userQueue;
    const queue = this.activeQueues.get(queueKey);
    if (queue) {
      queue.delete(userId);
      if (queue.size === 0) {
        this.activeQueues.delete(queueKey);
      }
    }

    this.userQueues.delete(userId);
    return true;
  }

  // Get user's queue status
  getQueueStatus(userId) {
    const userQueue = this.userQueues.get(userId);
    if (!userQueue) {
      return null;
    }

    const queue = this.activeQueues.get(userQueue.queueKey);
    return {
      inQueue: true,
      gameType: userQueue.gameType,
      stakeAmount: userQueue.stakeAmount,
      matchType: userQueue.matchType,
      position: queue ? Array.from(queue).indexOf(userId) + 1 : 1,
      totalWaiting: queue ? queue.size : 1,
      joinedAt: userQueue.joinedAt
    };
  }

  // Create a match between two players
  async createMatch(player1Id, player2Id, gameType, stakeAmount, matchType, externalMatchId = null) {
    // Verify both players have sufficient balance
    const [player1, player2] = await Promise.all([
      prisma.user.findUnique({ where: { id: player1Id } }),
      prisma.user.findUnique({ where: { id: player2Id } })
    ]);

    const p1Balance = matchType === 'real' ? player1.real_balance : player1.virtual_balance;
    const p2Balance = matchType === 'real' ? player2.real_balance : player2.virtual_balance;

    if (p1Balance < stakeAmount || p2Balance < stakeAmount) {
      throw new Error('One or both players have insufficient balance');
    }

    // Deduct stake from both players using walletService
    // All old stake deduction and escrow logic removed. New payout system will be implemented here.

    // In createMatch, after verifying balances, call escrowBets
    await escrowBets({ player1Id, player2Id, betAmount: stakeAmount, currency: matchType, matchId: null, gameType });

    // Create match record
    const match = await prisma.match.create({
      data: {
        gameType,
        player1Id,
        player2Id,
        betAmount: stakeAmount,
        status: 'active',
        startedAt: new Date(),
        gameState: this.getInitialGameState(gameType, [player1Id, player2Id]),
        // escrow: stakeAmount * 2, // Removed escrow
        matchType,
        ...(externalMatchId ? { externalMatchId } : {})
      }
    });

    // Log audit entries
    await prisma.auditLog.create({
      data: {
        userId: player1Id,
        action: 'MATCH_JOINED',
        details: JSON.stringify({ matchId: match.id, gameType, stakeAmount, matchType })
      }
    });
    await prisma.auditLog.create({
      data: {
        userId: player2Id,
        action: 'MATCH_JOINED',
        details: JSON.stringify({ matchId: match.id, gameType, stakeAmount, matchType })
      }
    });

    return match;
  }

  // Get initial game state based on game type
  getInitialGameState(gameType, playerIds) {
    switch (gameType) {
      case 'connect_four':
        return JSON.stringify({
          board: Array(6).fill(null).map(() => Array(7).fill(0)),
          currentPlayer: playerIds[0],
          players: playerIds,
          gameOver: false,
          winner: null
        });
      
      case 'tic_tac_toe':
        return JSON.stringify({
          board: Array(5).fill(null).map(() => Array(5).fill(null)),
          currentPlayer: playerIds[0],
          players: playerIds,
          gameOver: false,
          winner: null
        });
      
      case 'dice_battle':
        return JSON.stringify({
          player1Score: 0,
          player2Score: 0,
          currentPlayer: playerIds[0],
          players: playerIds,
          gameOver: false,
          winner: null,
          rounds: []
        });
      
      case 'diamond_hunt':
        const diamondData = this.generateDiamondGrid();
        return JSON.stringify({
          player1Score: 0,
          player2Score: 0,
          currentPlayer: playerIds[0],
          players: playerIds,
          gameOver: false,
          winner: null,
          grid: diamondData.grid,
          diamondPosition: diamondData.diamondPosition
        });
      
      case 'chess':
        return JSON.stringify({
          board: this.initializeChessBoard(),
          currentPlayer: playerIds[0],
          players: playerIds,
          gameOver: false,
          winner: null,
          turn: 'white',
          moveHistory: [],
          capturedPieces: []
        });
      
      default:
        return JSON.stringify({});
    }
  }

  // Initialize chess board with standard piece positions
  initializeChessBoard() {
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

  // Generate diamond hunt grid
  generateDiamondGrid() {
    const grid = Array(5).fill(null).map(() => Array(5).fill(false));
    
    // Place one diamond randomly
    const diamondRow = Math.floor(Math.random() * 5);
    const diamondCol = Math.floor(Math.random() * 5);
    
    grid[diamondRow][diamondCol] = true;
    
    return {
      grid,
      diamondPosition: { row: diamondRow, col: diamondCol }
    };
  }

  // Get queue statistics
  getQueueStats() {
    const stats = {};
    
    for (const [queueKey, queue] of this.activeQueues) {
      const [gameType, stakeAmount, matchType] = queueKey.split(':');
      const key = `${gameType}_${matchType}`;
      
      if (!stats[key]) {
        stats[key] = {
          gameType,
          matchType,
          queues: {}
        };
      }
      
      stats[key].queues[stakeAmount] = queue.size;
    }
    
    return stats;
  }

  // Clean up stale queues (older than 5 minutes)
  cleanupStaleQueues() {
    const now = new Date();
    const staleUsers = [];
    
    for (const [userId, queueInfo] of this.userQueues) {
      const timeDiff = now - queueInfo.joinedAt;
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        staleUsers.push(userId);
      }
    }
    
    staleUsers.forEach(userId => {
      this.removeFromQueue(userId);
    });
    
    return staleUsers.length;
  }
}

module.exports = new MatchmakingService(); 
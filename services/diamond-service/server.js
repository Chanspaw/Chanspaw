const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const fetch = require('node-fetch');
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'diamond-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const server = createServer(app);

// Socket.IO with production settings
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "https://api.dicebear.com"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage (replace with Redis/DB in production)
const activeGames = new Map();
const gameStates = new Map();

// Health check with detailed status
app.get('/health', (req, res) => {
  const health = {
    service: 'diamond-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeGames: activeGames.size,
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(health);
});

// Game API endpoints
// Replace local match creation with backend call
app.post('/api/game/initialize', async (req, res) => {
  const { matchId, player1, player2, stake, walletMode } = req.body;
  if (!matchId || !player1 || !player2) {
    return res.status(400).json({ success: false, error: 'Missing required parameters', required: ['matchId', 'player1', 'player2'] });
  }
  try {
    // Call backend to create match and deduct stakes
    const backendRes = await fetch(process.env.BACKEND_URL + '/api/match/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, player1, player2, stake, walletMode })
    });
    const backendData = await backendRes.json();
    if (!backendRes.ok) {
      return res.status(400).json({ success: false, error: backendData.error || 'Failed to create match' });
    }
    const gameState = {
      matchId,
      player1,
      player2,
      currentTurn: player1,
      board: initializeDiamondBoard(),
      diamonds: generateDiamondPositions(),
      found: {},
      stake,
      walletMode,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    activeGames.set(matchId, gameState);
    gameStates.set(matchId, gameState);
    res.json({ success: true, gameState, message: 'Diamond Hunt game initialized' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/game/move', (req, res) => {
  try {
    const { matchId, playerId, move } = req.body;
    
    const gameState = activeGames.get(matchId);
    if (!gameState) {
      return res.status(404).json({ 
        success: false,
        error: 'Game not found',
        matchId 
      });
    }

    if (gameState.currentTurn !== playerId) {
      return res.status(400).json({ 
        success: false,
        error: 'Not your turn',
        currentTurn: gameState.currentTurn 
      });
    }

    const moveResult = validateDiamondMove(gameState, move, playerId);
    if (!moveResult.valid) {
      return res.status(400).json({ 
        success: false,
        error: moveResult.error 
      });
    }

    // Apply move
    gameState.board = moveResult.newBoard;
    gameState.found = moveResult.newFound;
    gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
    gameState.lastActivity = new Date().toISOString();

    // Check win condition
    const winResult = checkDiamondWinCondition(gameState);
    if (winResult.gameOver) {
      gameState.status = 'finished';
      gameState.winner = winResult.winner;
      gameState.endedAt = new Date().toISOString();
    }

    activeGames.set(matchId, gameState);

    logger.info('Diamond move made', { 
      matchId, 
      playerId, 
      move, 
      gameOver: winResult.gameOver 
    });

    // Payout logic (same as Connect Four)
    if (gameState.status === 'finished' && gameState.winner) {
      (async () => {
        try {
          const payoutRes = await fetch('http://localhost:3001/api/payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              winnerId: gameState.winner,
              stake: gameState.stake,
              walletMode: gameState.walletMode
            })
          });
          const payoutData = await payoutRes.json();
          logger.info('Diamond payout result', { matchId: gameState.matchId, winnerId: gameState.winner, payoutData });
        } catch (err) {
          logger.error('Diamond payout error', { matchId: gameState.matchId, winnerId: gameState.winner, error: err.message });
        }
      })();
    }

    res.json({
      success: true,
      gameState,
      moveResult,
      winResult
    });
  } catch (error) {
    logger.error('Error processing move', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.get('/api/game/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    const gameState = activeGames.get(matchId);
    
    if (!gameState) {
      return res.status(404).json({ 
        success: false,
        error: 'Game not found',
        matchId 
      });
    }

    res.json({
      success: true,
      gameState
    });
  } catch (error) {
    logger.error('Error fetching game', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.delete('/api/game/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    
    if (activeGames.has(matchId)) {
      activeGames.delete(matchId);
      gameStates.delete(matchId);
      logger.info('Game cleaned up', { matchId });
    }

    res.json({
      success: true,
      message: 'Game cleaned up'
    });
  } catch (error) {
    logger.error('Error cleaning up game', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('joinGame', (matchId) => {
    socket.join(matchId);
    logger.info('Client joined game', { socketId: socket.id, matchId });
  });

  socket.on('makeMove', (data) => {
    try {
      const { matchId, playerId, move } = data;
      const gameState = activeGames.get(matchId);
      
      if (!gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const moveResult = validateDiamondMove(gameState, move, playerId);
      if (moveResult.valid) {
        // Apply move and broadcast to all players in the game
        gameState.board = moveResult.newBoard;
        gameState.found = moveResult.newFound;
        gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        gameState.lastActivity = new Date().toISOString();

        const winResult = checkDiamondWinCondition(gameState);
        if (winResult.gameOver) {
          gameState.status = 'finished';
          gameState.winner = winResult.winner;
          gameState.endedAt = new Date().toISOString();
        }

        activeGames.set(matchId, gameState);
        
        io.to(matchId).emit('moveMade', {
          gameState,
          moveResult,
          winResult
        });

        logger.info('Diamond move made via socket', { 
          matchId, 
          playerId, 
          move, 
          gameOver: winResult.gameOver 
        });

        // Payout logic (same as Connect Four)
        if (gameState.status === 'finished' && gameState.winner) {
          (async () => {
            try {
              const payoutRes = await fetch('http://localhost:3001/api/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  winnerId: gameState.winner,
                  stake: gameState.stake,
                  walletMode: gameState.walletMode
                })
              });
              const payoutData = await payoutRes.json();
              logger.info('Diamond payout result', { matchId: gameState.matchId, winnerId: gameState.winner, payoutData });
            } catch (err) {
              logger.error('Diamond payout error', { matchId: gameState.matchId, winnerId: gameState.winner, error: err.message });
            }
          })();
        }
      } else {
        socket.emit('error', { message: moveResult.error });
      }
    } catch (error) {
      logger.error('Error processing socket move', { error: error.message, stack: error.stack });
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Diamond Hunt game logic functions
function initializeDiamondBoard() {
  return Array(8).fill(null).map(() => Array(8).fill(0));
}

function generateDiamondPositions() {
  const diamonds = [];
  const positions = new Set();
  
  while (diamonds.length < 5) {
    const row = Math.floor(Math.random() * 8);
    const col = Math.floor(Math.random() * 8);
    const key = `${row},${col}`;
    
    if (!positions.has(key)) {
      positions.add(key);
      diamonds.push({ row, col, found: false });
    }
  }
  
  return diamonds;
}

function validateDiamondMove(gameState, move, playerId) {
  const { row, col } = move;
  
  if (row < 0 || row >= 8 || col < 0 || col >= 8) {
    return { valid: false, error: 'Invalid position' };
  }

  if (gameState.board[row][col] !== 0) {
    return { valid: false, error: 'Position already revealed' };
  }

  // Check if diamond is at this position
  const diamond = gameState.diamonds.find(d => d.row === row && d.col === col);
  const newBoard = gameState.board.map(row => [...row]);
  const newFound = { ...gameState.found };
  
  if (diamond && !diamond.found) {
    newBoard[row][col] = 2; // Diamond found
    diamond.found = true;
    newFound[playerId] = (newFound[playerId] || 0) + 1;
  } else {
    newBoard[row][col] = 1; // Empty cell
  }

  return {
    valid: true,
    newBoard,
    newFound,
    foundDiamond: !!diamond,
    diamondsFound: newFound[playerId] || 0
  };
}

function checkDiamondWinCondition(gameState) {
  const player1Diamonds = gameState.found[gameState.player1] || 0;
  const player2Diamonds = gameState.found[gameState.player2] || 0;
  
  if (player1Diamonds >= 3) {
    return { gameOver: true, winner: gameState.player1, reason: 'diamonds_found' };
  }
  if (player2Diamonds >= 3) {
    return { gameOver: true, winner: gameState.player2, reason: 'diamonds_found' };
  }
  
  // Check if all diamonds are found
  const totalFound = Object.values(gameState.found).reduce((sum, count) => sum + count, 0);
  if (totalFound >= 5) {
    const winner = player1Diamonds > player2Diamonds ? gameState.player1 : gameState.player2;
    return { gameOver: true, winner, reason: 'all_diamonds_found' };
  }
  
  return { gameOver: false };
}

// Cleanup old games periodically
setInterval(() => {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [matchId, gameState] of activeGames.entries()) {
    const gameAge = now - new Date(gameState.createdAt);
    const lastActivity = now - new Date(gameState.lastActivity);
    
    // Clean up games older than 24 hours or inactive for 2 hours
    if (gameAge > 24 * 60 * 60 * 1000 || lastActivity > 2 * 60 * 60 * 1000) {
      activeGames.delete(matchId);
      gameStates.delete(matchId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info('Cleaned up old games', { count: cleanedCount });
  }
}, 60 * 60 * 1000); // Check every hour

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Admin endpoints
app.use('/admin', (req, res, next) => {
  // Verify admin token (simplified - in production use proper JWT verification)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Get diamond hunt game statistics
app.get('/admin/stats', (req, res) => {
  const stats = {
    totalGames: activeGames.size,
    activeGames: Array.from(activeGames.values()).filter(game => game.status === 'playing').length,
    waitingGames: Array.from(activeGames.values()).filter(game => game.status === 'waiting').length,
    totalPlayers: new Set(Array.from(activeGames.values()).flatMap(game => [game.player1, game.player2])).size,
    averageGameDuration: calculateAverageGameDuration(),
    averageScore: calculateAverageScore(),
    highScores: getHighScores(),
    diamondDistribution: getDiamondDistribution()
  };
  
  res.json({ success: true, data: stats });
});

// Get live diamond hunt games
app.get('/admin/live', (req, res) => {
  const liveGames = Array.from(activeGames.values())
    .filter(game => game.status === 'playing')
    .map(game => ({
      id: game.matchId,
      gameId: 'diamond_hunt',
      gameName: 'Diamond Hunt',
      player1: game.player1,
      player2: game.player2,
      status: game.status,
      bet: game.bet || 0,
      startTime: game.startTime,
      duration: Date.now() - game.startTime,
      spectators: game.spectators || 0,
      currentScore: game.currentScore || 0,
      diamondsFound: game.diamondsFound || 0
    }));
  
  res.json({ success: true, data: { games: liveGames } });
});

// Get finished diamond hunt games
app.get('/admin/finished', (req, res) => {
  const finishedGames = Array.from(activeGames.values())
    .filter(game => game.status === 'finished')
    .map(game => ({
      id: game.matchId,
      gameId: 'diamond_hunt',
      gameName: 'Diamond Hunt',
      player1: game.player1,
      player2: game.player2,
      winner: game.winner,
      bet: game.bet || 0,
      startTime: game.startTime,
      endTime: game.endTime,
      duration: game.endTime - game.startTime,
      replayAvailable: true,
      finalScore: game.finalScore || 0,
      diamondsFound: game.diamondsFound || 0,
      result: game.result
    }));
  
  res.json({ success: true, data: { games: finishedGames } });
});

// Get diamond hunt game logs
app.get('/admin/logs', (req, res) => {
  const logs = Array.from(activeGames.values())
    .map(game => ({
      id: game.matchId,
      gameId: 'diamond_hunt',
      gameName: 'Diamond Hunt',
      matchId: game.matchId,
      player1: game.player1,
      player2: game.player2,
      winner: game.winner,
      moves: game.moves || [],
      startTime: game.startTime,
      endTime: game.endTime,
      duration: game.endTime ? game.endTime - game.startTime : 0,
      bet: game.bet || 0,
      suspiciousActivity: false,
      flags: [],
      finalScore: game.finalScore || 0,
      diamondsFound: game.diamondsFound || 0
    }));
  
  res.json({ success: true, data: { logs } });
});

// Force end a diamond hunt game
app.post('/admin/end-game/:matchId', (req, res) => {
  const { matchId } = req.params;
  const game = activeGames.get(matchId);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  // Force end the game
  game.status = 'finished';
  game.endTime = Date.now();
  game.result = 'admin_terminated';
  
  // Notify players
  io.to(matchId).emit('gameEnded', {
    winner: null,
    reason: 'Game terminated by admin',
    matchId
  });
  
  res.json({ success: true, message: 'Game terminated successfully' });
});

// Get diamond hunt game configuration
app.get('/admin/config', (req, res) => {
  const config = {
    gameId: 'diamond_hunt',
    name: 'Diamond Hunt',
    description: 'Find diamonds in the grid before time runs out',
    minBet: 5,
    maxBet: 500,
    players: 2,
    isActive: true,
    rules: [
      { name: 'Grid Size', description: '6x6 grid' },
      { name: 'Time Limit', description: '60 seconds' },
      { name: 'Diamond Count', description: '5 diamonds per game' },
      { name: 'Scoring', description: 'Points based on diamonds found and time remaining' }
    ]
  };
  
  res.json({ success: true, data: config });
});

// Update diamond hunt game configuration
app.put('/admin/config', (req, res) => {
  const { minBet, maxBet, isActive, timeLimit, diamondCount } = req.body;
  
  // Update configuration (in production, store in database)
  console.log('Diamond Hunt configuration updated:', { minBet, maxBet, isActive, timeLimit, diamondCount });
  
  res.json({ success: true, message: 'Configuration updated successfully' });
});

// Helper functions
function calculateAverageGameDuration() {
  const finishedGames = Array.from(activeGames.values()).filter(game => game.status === 'finished');
  if (finishedGames.length === 0) return 0;
  
  const totalDuration = finishedGames.reduce((sum, game) => {
    return sum + (game.endTime - game.startTime);
  }, 0);
  
  return Math.round(totalDuration / finishedGames.length / 1000); // in seconds
}

function calculateAverageScore() {
  const finishedGames = Array.from(activeGames.values()).filter(game => game.status === 'finished');
  if (finishedGames.length === 0) return 0;
  
  const totalScore = finishedGames.reduce((sum, game) => {
    return sum + (game.finalScore || 0);
  }, 0);
  
  return Math.round(totalScore / finishedGames.length);
}

function getHighScores() {
  const finishedGames = Array.from(activeGames.values())
    .filter(game => game.status === 'finished')
    .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    .slice(0, 10)
    .map(game => ({
      player: game.winner,
      score: game.finalScore || 0,
      diamondsFound: game.diamondsFound || 0,
      date: new Date(game.endTime).toISOString()
    }));
  
  return finishedGames;
}

function getDiamondDistribution() {
  const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  Array.from(activeGames.values()).forEach(game => {
    if (game.status === 'finished') {
      const diamonds = game.diamondsFound || 0;
      distribution[diamonds] = (distribution[diamonds] || 0) + 1;
    }
  });
  
  return distribution;
}

const PORT = process.env.PORT || 4003;
server.listen(PORT, () => {
  logger.info('Diamond service started', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/health`
  });
}); 
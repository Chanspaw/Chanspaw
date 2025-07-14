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
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'connect4-service' },
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
      imgSrc: ["'self'", "data:", "https:"],
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
    service: 'connect4-service',
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
      board: initializeConnect4Board(),
      stake,
      walletMode,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    activeGames.set(matchId, gameState);
    gameStates.set(matchId, gameState);
    res.json({ success: true, gameState, message: 'Connect Four game initialized' });
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

    const moveResult = validateConnect4Move(gameState, move, playerId);
    if (!moveResult.valid) {
      return res.status(400).json({ 
        success: false,
        error: moveResult.error 
      });
    }

    // Apply move
    gameState.board = moveResult.newBoard;
    gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
    gameState.lastActivity = new Date().toISOString();

    // Check win condition
    const winResult = checkConnect4WinCondition(gameState);
    if (winResult.gameOver) {
      gameState.status = 'finished';
      gameState.winner = winResult.winner;
      gameState.endedAt = new Date().toISOString();
    }

    activeGames.set(matchId, gameState);

    logger.info('Connect4 move made', { 
      matchId, 
      playerId, 
      move, 
      gameOver: winResult.gameOver 
    });

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

      const moveResult = validateConnect4Move(gameState, move, playerId);
      if (moveResult.valid) {
        // Apply move and broadcast to all players in the game
        gameState.board = moveResult.newBoard;
        gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        gameState.lastActivity = new Date().toISOString();

        const winResult = checkConnect4WinCondition(gameState);
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

        logger.info('Connect4 move made via socket', { 
          matchId, 
          playerId, 
          move, 
          gameOver: winResult.gameOver 
        });
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

// Connect Four game logic functions
function initializeConnect4Board() {
  return Array(6).fill(null).map(() => Array(7).fill(0));
}

function validateConnect4Move(gameState, move, playerId) {
  const { column } = move;
  
  if (column < 0 || column >= 7) {
    return { valid: false, error: 'Invalid column' };
  }

  // Check if column is full
  if (gameState.board[0][column] !== 0) {
    return { valid: false, error: 'Column is full' };
  }

  // Find the lowest empty cell in the column
  let row = 5;
  while (row >= 0 && gameState.board[row][column] !== 0) {
    row--;
  }

  if (row < 0) {
    return { valid: false, error: 'Column is full' };
  }

  // Place the piece
  const newBoard = gameState.board.map(row => [...row]);
  const playerNumber = gameState.player1 === playerId ? 1 : 2;
  newBoard[row][column] = playerNumber;

  return {
    valid: true,
    newBoard,
    placedAt: { row, column },
    playerNumber
  };
}

function checkConnect4WinCondition(gameState) {
  const board = gameState.board;
  
  // Check horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col <= 3; col++) {
      const cell = board[row][col];
      if (cell !== 0 &&
          cell === board[row][col + 1] &&
          cell === board[row][col + 2] &&
          cell === board[row][col + 3]) {
        const winner = cell === 1 ? gameState.player1 : gameState.player2;
        return { gameOver: true, winner, reason: 'horizontal', positions: [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]] };
      }
    }
  }

  // Check vertical
  for (let row = 0; row <= 2; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = board[row][col];
      if (cell !== 0 &&
          cell === board[row + 1][col] &&
          cell === board[row + 2][col] &&
          cell === board[row + 3][col]) {
        const winner = cell === 1 ? gameState.player1 : gameState.player2;
        return { gameOver: true, winner, reason: 'vertical', positions: [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]] };
      }
    }
  }

  // Check diagonal (positive slope)
  for (let row = 0; row <= 2; row++) {
    for (let col = 0; col <= 3; col++) {
      const cell = board[row][col];
      if (cell !== 0 &&
          cell === board[row + 1][col + 1] &&
          cell === board[row + 2][col + 2] &&
          cell === board[row + 3][col + 3]) {
        const winner = cell === 1 ? gameState.player1 : gameState.player2;
        return { gameOver: true, winner, reason: 'diagonal', positions: [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]] };
      }
    }
  }

  // Check diagonal (negative slope)
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col <= 3; col++) {
      const cell = board[row][col];
      if (cell !== 0 &&
          cell === board[row - 1][col + 1] &&
          cell === board[row - 2][col + 2] &&
          cell === board[row - 3][col + 3]) {
        const winner = cell === 1 ? gameState.player1 : gameState.player2;
        return { gameOver: true, winner, reason: 'diagonal', positions: [[row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]] };
      }
    }
  }

  // Check for draw
  const isFull = board[0].every(cell => cell !== 0);
  if (isFull) {
    return { gameOver: true, winner: null, reason: 'draw' };
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

// Get connect four game statistics
app.get('/admin/stats', (req, res) => {
  const stats = {
    totalGames: activeGames.size,
    activeGames: Array.from(activeGames.values()).filter(game => game.status === 'playing').length,
    waitingGames: Array.from(activeGames.values()).filter(game => game.status === 'waiting').length,
    totalPlayers: new Set(Array.from(activeGames.values()).flatMap(game => [game.player1, game.player2])).size,
    averageGameDuration: calculateAverageGameDuration(),
    averageMoves: calculateAverageMoves(),
    winRates: getWinRates(),
    columnUsage: getColumnUsage()
  };
  
  res.json({ success: true, data: stats });
});

// Get live connect four games
app.get('/admin/live', (req, res) => {
  const liveGames = Array.from(activeGames.values())
    .filter(game => game.status === 'playing')
    .map(game => ({
      id: game.matchId,
      gameId: 'connect_four',
      gameName: 'Connect Four',
      player1: game.player1,
      player2: game.player2,
      status: game.status,
      bet: game.bet || 0,
      startTime: game.startTime,
      duration: Date.now() - game.startTime,
      spectators: game.spectators || 0,
      currentTurn: game.currentTurn,
      moveCount: game.moves ? game.moves.length : 0,
      boardState: game.board
    }));
  
  res.json({ success: true, data: { games: liveGames } });
});

// Get finished connect four games
app.get('/admin/finished', (req, res) => {
  const finishedGames = Array.from(activeGames.values())
    .filter(game => game.status === 'finished')
    .map(game => ({
      id: game.matchId,
      gameId: 'connect_four',
      gameName: 'Connect Four',
      player1: game.player1,
      player2: game.player2,
      winner: game.winner,
      bet: game.bet || 0,
      startTime: game.startTime,
      endTime: game.endTime,
      duration: game.endTime - game.startTime,
      replayAvailable: true,
      moveCount: game.moves ? game.moves.length : 0,
      result: game.result,
      finalBoard: game.board
    }));
  
  res.json({ success: true, data: { games: finishedGames } });
});

// Get connect four game logs
app.get('/admin/logs', (req, res) => {
  const logs = Array.from(activeGames.values())
    .map(game => ({
      id: game.matchId,
      gameId: 'connect_four',
      gameName: 'Connect Four',
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
      finalBoard: game.board
    }));
  
  res.json({ success: true, data: { logs } });
});

// Force end a connect four game
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

// Get connect four game configuration
app.get('/admin/config', (req, res) => {
  const config = {
    gameId: 'connect_four',
    name: 'Connect Four',
    description: 'Classic connect four game with real-time multiplayer',
    minBet: 10,
    maxBet: 1000,
    players: 2,
    isActive: true,
    rules: [
      { name: 'Board Size', description: '6 rows x 7 columns' },
      { name: 'Win Condition', description: 'Connect 4 pieces in a row' },
      { name: 'Move Validation', description: 'Pieces fall to bottom of column' },
      { name: 'Draw Condition', description: 'Board is full' }
    ]
  };
  
  res.json({ success: true, data: config });
});

// Update connect four game configuration
app.put('/admin/config', (req, res) => {
  const { minBet, maxBet, isActive } = req.body;
  
  // Update configuration (in production, store in database)
  console.log('Connect Four configuration updated:', { minBet, maxBet, isActive });
  
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

function calculateAverageMoves() {
  const finishedGames = Array.from(activeGames.values()).filter(game => game.status === 'finished');
  if (finishedGames.length === 0) return 0;
  
  const totalMoves = finishedGames.reduce((sum, game) => {
    return sum + (game.moves ? game.moves.length : 0);
  }, 0);
  
  return Math.round(totalMoves / finishedGames.length);
}

function getWinRates() {
  const stats = { player1: { wins: 0, total: 0 }, player2: { wins: 0, total: 0 } };
  
  Array.from(activeGames.values()).forEach(game => {
    if (game.status === 'finished' && game.winner) {
      if (game.winner === game.player1) {
        stats.player1.wins++;
      } else {
        stats.player2.wins++;
      }
      stats.player1.total++;
      stats.player2.total++;
    }
  });
  
  return {
    player1: stats.player1.total > 0 ? (stats.player1.wins / stats.player1.total * 100).toFixed(1) : 0,
    player2: stats.player2.total > 0 ? (stats.player2.wins / stats.player2.total * 100).toFixed(1) : 0
  };
}

function getColumnUsage() {
  const columnUsage = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  Array.from(activeGames.values()).forEach(game => {
    if (game.moves) {
      game.moves.forEach(move => {
        if (move.column !== undefined) {
          columnUsage[move.column] = (columnUsage[move.column] || 0) + 1;
        }
      });
    }
  });
  
  return columnUsage;
}

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => {
  logger.info('Connect4 service started', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/health`
  });
}); 
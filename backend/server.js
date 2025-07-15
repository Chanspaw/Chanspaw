const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const client = require('prom-client');
const Redis = require('ioredis');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const csurf = require('csurf');
let Chess;
try {
  const chessModule = require('chess.js');
  Chess = chessModule.Chess || chessModule.default || chessModule;
  
  // Verify Chess library is properly loaded
  if (typeof Chess !== 'function') {
    console.error('[ERROR] Chess library not properly loaded:', typeof Chess);
    console.error('[ERROR] Available exports:', Object.keys(chessModule));
    process.exit(1);
  }
  console.log('[CHESS] Library loaded successfully');
} catch (error) {
  console.error('[ERROR] Failed to load chess.js:', error.message);
  process.exit(1);
}

// Load environment variables with defaults
try {
  require('dotenv').config();
} catch (error) {
  console.log('No .env file found, using defaults');
}

// Set default environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
process.env.JWT_SECRET = process.env.JWT_SECRET || "chanspaw-super-secret-jwt-key-2025";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || "12";
process.env.PORT = process.env.PORT || "3002";
process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5178";

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const gameRoutes = require('./routes/games');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const contentRoutes = require('./routes/content');
const notificationRoutes = require('./routes/notifications');
const commissionRoutes = require('./routes/commission');
const gameRulesRoutes = require('./routes/gameRules');
const ownerProfitRoutes = require('./routes/ownerProfit');

// Phase 3 Routes
const complianceRoutes = require('./routes/compliance');
const reportingRoutes = require('./routes/reporting');
const apiManagementRoutes = require('./routes/api-management');
const integrationRoutes = require('./routes/integrations');
const performanceRoutes = require('./routes/performance');

const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const matchmakingService = require('./services/matchmakingService');
const { payoutWinnings } = require('./services/walletService');

const app = express();
const PORT = process.env.PORT || 3002;

// Fix: Trust proxy for Render and reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https://api.dicebear.com"],
    connectSrc: ["'self'", "ws:", "wss:", "https://api.dicebear.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
  'https://chanspaw.com',
  'https://www.chanspaw.com',
  'https://chanspaw.onrender.com'
];
app.use('/api', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use('/auth', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to check active games
app.get('/debug/games', (req, res) => {
  const activeGamesInfo = Array.from(activeGames.entries()).map(([matchId, gameState]) => ({
    matchId,
    gameId: gameState.gameId,
    player1: gameState.player1,
    player2: gameState.player2,
    currentTurn: gameState.currentTurn,
    gameEnded: gameState.gameEnded,
    createdAt: gameState.createdAt,
    lastMoveAt: gameState.lastMoveAt
  }));
  
  res.json({
    activeGamesCount: activeGames.size,
    activeGames: activeGamesInfo,
    matchmakingQueueLength: matchmakingQueue.length,
    userSocketsCount: userSockets.size
  });
});

// Debug endpoint to test socket emissions
app.get('/debug/test-socket/:matchId', (req, res) => {
  const { matchId } = req.params;
  const gameState = activeGames.get(matchId);
  
  if (!gameState) {
    return res.json({ error: 'Game not found' });
  }
  
  const { players } = gameState;
  const [playerSocket, opponentSocket] = [userSockets.get(players[0]), userSockets.get(players[1])];
  
  const testPayload = {
    matchId,
    move: { from: 'e2', to: 'e4' },
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    turn: 'b',
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
  };
  
  console.log(`[DEBUG] Testing socket emission for match ${matchId}`);
  console.log(`[DEBUG] Players:`, players);
  console.log(`[DEBUG] Sockets:`, {
    player1: playerSocket?.id,
    player2: opponentSocket?.id
  });
  
  if (playerSocket) {
    playerSocket.emit('moveMade', testPayload);
    console.log(`[DEBUG] Emitted to player 1`);
  }
  
  if (opponentSocket) {
    opponentSocket.emit('moveMade', testPayload);
    console.log(`[DEBUG] Emitted to player 2`);
  }
  
  res.json({
    success: true,
    matchId,
    players,
    socketsFound: {
      player1: !!playerSocket,
      player2: !!opponentSocket
    },
    testPayload
  });
});

// Debug endpoint to test yourTurn events
app.get('/debug/test-turn/:matchId', (req, res) => {
  const { matchId } = req.params;
  const gameState = activeGames.get(matchId);
  
  if (!gameState) {
    return res.json({ error: 'Game not found' });
  }
  
  const { players, chess } = gameState;
  const [playerSocket, opponentSocket] = [userSockets.get(players[0]), userSockets.get(players[1])];
  
  // Get current turn
  const currentTurn = chess ? chess.turn() : 'w';
  const nextTurn = currentTurn === 'w' ? 'b' : 'w';
  const nextTurnColor = nextTurn === 'w' ? 'white' : 'black';
  const nextPlayerId = nextTurnColor === 'white' ? players[0] : players[1];
  const nextPlayerSocket = userSockets.get(nextPlayerId);
  
  console.log(`[DEBUG] Testing yourTurn event for match ${matchId}`);
  console.log(`[DEBUG] Current turn: ${currentTurn}, Next turn: ${nextTurn}`);
  console.log(`[DEBUG] Next player: ${nextPlayerId}`);
  
  if (nextPlayerSocket) {
    nextPlayerSocket.emit('yourTurn', {
      matchId,
      yourTurn: true
    });
    console.log(`[DEBUG] Emitted yourTurn: true to ${nextPlayerId}`);
  }
  
  // Also emit yourTurn: false to the current player
  const currentPlayerId = currentTurn === 'w' ? players[0] : players[1];
  const currentPlayerSocket = userSockets.get(currentPlayerId);
  
  if (currentPlayerSocket) {
    currentPlayerSocket.emit('yourTurn', {
      matchId,
      yourTurn: false
    });
    console.log(`[DEBUG] Emitted yourTurn: false to ${currentPlayerId}`);
  }
  
  res.json({
    success: true,
    matchId,
    players,
    currentTurn,
    nextTurn,
    nextPlayerId,
    currentPlayerId,
    socketsFound: {
      nextPlayer: !!nextPlayerSocket,
      currentPlayer: !!currentPlayerSocket
    }
  });
});

// Enforce HTTPS in production for www.chanspaw.com
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.hostname === 'www.chanspaw.com') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}

// Input sanitization
app.use(mongoSanitize());
app.use(xss());

// CSRF protection (enabled for sensitive routes)
const csrfProtection = csurf({ cookie: true });
// Example: apply to all POST/PUT/DELETE routes under /api/payments and /api/users
app.use(['/api/payments', '/api/users'], csrfProtection, (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, error: 'Invalid CSRF token' });
  }
  next();
});

// API routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/friends', authenticateToken, friendRoutes);
app.use('/api/games', authenticateToken, gameRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/wallet', authenticateToken, paymentRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Support routes
app.use('/api/support', supportRoutes);

// Content management routes
app.use('/api/content', contentRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Commission routes
app.use('/api/commission', commissionRoutes);

// Owner profit routes
app.use('/api/owner-profit', ownerProfitRoutes);

// Game rules routes
app.use('/api/game-rules', gameRulesRoutes);

// Phase 3 Routes
app.use('/api/compliance', complianceRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/api-management', apiManagementRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/performance', performanceRoutes);

// Expose /metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Serve static files from the frontend build
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

// For any route not handled by the API, serve index.html (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Adjust for production!
});

// User-to-socket mapping
const userSockets = new Map(); // userId -> socket

// Helper function to check Connect Four winner
function checkConnectFourWinner(board) {
  console.log(`[WIN_CHECK] Checking board for winner:`, JSON.stringify(board));
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      
      // Check horizontal (4 in a row)
      if (c <= 3 && 
          board[r][c] === cell && 
          board[r][c+1] === cell && 
          board[r][c+2] === cell && 
          board[r][c+3] === cell) {
        console.log(`[WIN_CHECK] Horizontal win found at row ${r}, col ${c} for player ${cell}`);
        return cell;
      }
      
      // Check vertical (4 in a row)
      if (r <= 2 && 
          board[r][c] === cell && 
          board[r+1][c] === cell && 
          board[r+2][c] === cell && 
          board[r+3][c] === cell) {
        console.log(`[WIN_CHECK] Vertical win found at row ${r}, col ${c} for player ${cell}`);
        return cell;
      }
      
      // Check diagonal (top-left to bottom-right)
      if (c <= 3 && r <= 2 && 
          board[r][c] === cell && 
          board[r+1][c+1] === cell && 
          board[r+2][c+2] === cell && 
          board[r+3][c+3] === cell) {
        console.log(`[WIN_CHECK] Diagonal win found at row ${r}, col ${c} for player ${cell}`);
        return cell;
      }
      
      // Check diagonal (top-right to bottom-left)
      if (c >= 3 && r <= 2 && 
          board[r][c] === cell && 
          board[r+1][c-1] === cell && 
          board[r+2][c-2] === cell && 
          board[r+3][c-3] === cell) {
        console.log(`[WIN_CHECK] Diagonal win found at row ${r}, col ${c} for player ${cell}`);
        return cell;
      }
    }
  }
  console.log(`[WIN_CHECK] No winner found`);
  return null;
}

// Helper function to check for TicTacToe 5x5 winner (4-in-a-row)
function checkTicTacToe5x5Winner(board) {
  console.log(`[TICTACTOE5X5] Checking winner for board:`, board);
  
  // Check rows - check ALL possible 4-in-a-row combinations
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= 1; col++) {
      if (board[row][col] && 
          board[row][col] === board[row][col + 1] && 
          board[row][col] === board[row][col + 2] && 
          board[row][col] === board[row][col + 3]) {
        console.log(`[TICTACTOE5X5] Row winner found at row ${row}, col ${col}: ${board[row][col]}`);
        return board[row][col];
      }
    }
  }
  
  // Check columns - check ALL possible 4-in-a-row combinations
  for (let row = 0; row <= 1; row++) {
    for (let col = 0; col < 5; col++) {
      if (board[row][col] && 
          board[row][col] === board[row + 1][col] && 
          board[row][col] === board[row + 2][col] && 
          board[row][col] === board[row + 3][col]) {
        console.log(`[TICTACTOE5X5] Column winner found at row ${row}, col ${col}: ${board[row][col]}`);
        return board[row][col];
      }
    }
  }
  
  // Check diagonals (top-left to bottom-right) - check ALL possible 4-in-a-row combinations
  for (let row = 0; row <= 1; row++) {
    for (let col = 0; col <= 1; col++) {
      if (board[row][col] && 
          board[row][col] === board[row + 1][col + 1] && 
          board[row][col] === board[row + 2][col + 2] && 
          board[row][col] === board[row + 3][col + 3]) {
        console.log(`[TICTACTOE5X5] Diagonal winner found at row ${row}, col ${col}: ${board[row][col]}`);
        return board[row][col];
      }
    }
  }
  
  // Check diagonals (top-right to bottom-left) - check ALL possible 4-in-a-row combinations
  for (let row = 0; row <= 1; row++) {
    for (let col = 3; col < 5; col++) {
      if (board[row][col] && 
          board[row][col] === board[row + 1][col - 1] && 
          board[row][col] === board[row + 2][col - 2] && 
          board[row][col] === board[row + 3][col - 3]) {
        console.log(`[TICTACTOE5X5] Diagonal winner found at row ${row}, col ${col}: ${board[row][col]}`);
        return board[row][col];
      }
    }
  }
  
  console.log(`[TICTACTOE5X5] No winner found`);
  return null; // No winner
}

// Socket.io authentication middleware (JWT validation)
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized: No token provided'));
  let userId = null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    userId = payload.userId || payload.id || payload.sub;
    if (!userId) return next(new Error('Unauthorized: Invalid token payload'));
  } catch (e) {
    return next(new Error('Unauthorized: Invalid token'));
  }
  socket.userId = userId;
  next();
});

// Per-user rate limiting for socket events
const socketRateLimits = new Map(); // userId -> { count, lastReset }
const SOCKET_LIMIT = 10;
const SOCKET_WINDOW_MS = 5000;

// Store socket mapping for notifications
const socketMap = new Map(); // userId -> socket

// --- Real-time 1v1 Matchmaking with Socket.io ---
const matchmakingQueue = [];
let matchCounter = 1;

// Game state tracking
const activeGames = new Map(); // matchId -> gameState
const gameTimers = new Map(); // matchId -> timer

// Game state structure
class GameState {
  constructor(matchId, gameId, player1, player2, stake, walletMode) {
    this.matchId = matchId;
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
    this.stake = stake;
    this.walletMode = walletMode;
    this.currentTurn = null; // Will be set randomly
    this.gameStarted = false;
    this.gameEnded = false;
    this.winner = null;
    this.createdAt = new Date();
    this.lastMoveAt = null;
    this.revealed = null; // Added for Diamond Hunt
    // Always include players array for all games
    this.players = [player1, player2];
    
    // PATCH: Always initialize board for supported games
    const normalizedGameId = (gameId || '').toLowerCase().trim();
    if (normalizedGameId === 'tic_tac_toe') {
      this.board = Array(3).fill(null).map(() => Array(3).fill(null));
    } else if (
      normalizedGameId === 'tictactoe5x5' ||
      normalizedGameId === 'tic_tac_toe_5x5' ||
      normalizedGameId === 'tic-tac-toe-5x5' ||
      normalizedGameId === 'tic_tac_toe5x5' ||
      normalizedGameId === 'tictactoe-5x5'
    ) {
      this.board = Array(5).fill(null).map(() => Array(5).fill(null));
    } else if (normalizedGameId === 'connect_four') {
      this.board = Array(6).fill(null).map(() => Array(7).fill(0));
    } else if (normalizedGameId === 'chess') {
      // Initialize chess board with standard piece positions
      this.board = Array(8).fill(null).map(() => Array(8).fill(null));
      // Initialize pawns
      for (let i = 0; i < 8; i++) {
        this.board[1][i] = { type: 'pawn', color: 'black', hasMoved: false };
        this.board[6][i] = { type: 'pawn', color: 'white', hasMoved: false };
      }
      // Initialize other pieces
      const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
      for (let i = 0; i < 8; i++) {
        this.board[0][i] = { type: backRank[i], color: 'black', hasMoved: false };
        this.board[7][i] = { type: backRank[i], color: 'white', hasMoved: false };
      }
      this.turnIndex = 0; // 0 = white, 1 = black
      this.moveHistory = [];
      this.capturedPieces = [];
      console.log('[CHESS] Board initialized in GameState constructor for match:', matchId);
    }
    // Defensive fallback: if gameId contains 'chess' and board is still undefined, initialize it
    if (!this.board && normalizedGameId.includes('chess')) {
      console.error(`[CHESS] Board was undefined after constructor for match ${matchId}, forcibly initializing.`);
      this.board = Array(8).fill(null).map(() => Array(8).fill(null));
      for (let i = 0; i < 8; i++) {
        this.board[1][i] = { type: 'pawn', color: 'black', hasMoved: false };
        this.board[6][i] = { type: 'pawn', color: 'white', hasMoved: false };
      }
      const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
      for (let i = 0; i < 8; i++) {
        this.board[0][i] = { type: backRank[i], color: 'black', hasMoved: false };
        this.board[7][i] = { type: backRank[i], color: 'white', hasMoved: false };
      }
      this.turnIndex = 0;
      this.moveHistory = [];
      this.capturedPieces = [];
    }
    // For Diamond Hunt: generate shared diamond position
    if (gameId === 'diamond_hunt') {
      this.diamondPosition = {
        row: Math.floor(Math.random() * 5),
        col: Math.floor(Math.random() * 5)
      };
      console.log(`[DIAMOND] Generated diamond position for match ${matchId}:`, this.diamondPosition);
    }
  }
}

// --- Helper to get sockets for both players (define at top-level) ---
function getPlayerSockets(player1, player2) {
  return [userSockets.get(player1), userSockets.get(player2)];
}

io.on('connection', async (socket) => {
  // At the top of the socket.on('connection', ...) handler, before any event handlers:
  if (!socket.userId) {
    console.log('Unauthorized socket connection:', socket.id);
    return socket.disconnect();
  }
  console.log(`[SOCKET] User connected: ${socket.userId} (${socket.id})`);
  // PATCH: Always keep userSockets up to date
  userSockets.set(socket.userId, socket);

  // --- Set user as online in DB ---
  try {
    await prisma.user.update({
      where: { id: socket.userId },
      data: { isActive: true }
    });
  } catch (err) {
    console.error(`[SOCKET] Failed to set user ${socket.userId} as online:`, err.message);
  }

  // --- Broadcast online status to all connected users ---
  const onlineUserIds = Array.from(userSockets.keys());
  io.emit('online_users', onlineUserIds);
  io.emit('user_status_change', { userId: socket.userId, status: 'online' });
  console.log(`[STATUS] User ${socket.userId} is now online. Total online: ${onlineUserIds.length}`);

  // --- Send current online users to the newly connected user ---
  socket.emit('online_users', onlineUserIds);

  // --- Handle requests for online users ---
  socket.on('getOnlineUsers', () => {
    const onlineUserIds = Array.from(userSockets.keys());
    socket.emit('online_users', onlineUserIds);
    console.log(`[STATUS] Sent online users to ${socket.userId}:`, onlineUserIds);
  });

  socket.on('joinQueue', async (data) => {
    const { gameId, walletMode, stake } = data;
    console.log(`[JOIN] User ${socket.userId} joining queue: gameId=${gameId}, walletMode=${walletMode}, stake=${stake}`);
    // Remove user from any existing queue first
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (matchmakingQueue[i].userId === socket.userId) {
        matchmakingQueue.splice(i, 1);
        console.log(`[REMOVE] Removed ${socket.userId} from existing queue`);
      }
    }
    // Look for a match
    const match = matchmakingQueue.find(
      (entry) =>
        entry.gameId === gameId &&
        entry.walletMode === walletMode &&
        entry.stake === stake &&
        entry.userId !== socket.userId
    );
    if (match) {
      // Found a match!
      matchmakingQueue.splice(matchmakingQueue.indexOf(match), 1);
      const matchId = `match_${Date.now()}_${matchCounter++}`;
      // Randomly select who starts (50/50 chance)
      const firstPlayer = Math.random() < 0.5 ? match.userId : socket.userId;
      const secondPlayer = firstPlayer === match.userId ? socket.userId : match.userId;
      // --- PATCH: Use backend service for match creation and stake deduction ---
      try {
        const matchRecord = await matchmakingService.createMatch(firstPlayer, secondPlayer, gameId, stake, walletMode);
        // Create game state
        const gameState = new GameState(matchId, gameId, firstPlayer, secondPlayer, stake, walletMode);
        gameState.currentTurn = firstPlayer; // First player starts
        activeGames.set(matchId, gameState);
        
        // Debug logging
        console.log(`[DEBUG] Created game state for matchId: ${matchId}`);
        console.log(`[DEBUG] Active games count: ${activeGames.size}`);
        console.log(`[DEBUG] Game state stored:`, {
          matchId,
          gameId,
          player1: firstPlayer,
          player2: secondPlayer,
          currentTurn: gameState.currentTurn,
          board: gameState.board
        });
        
        // Always get sockets from global map as fallback
        const firstPlayerSocket = userSockets.get(firstPlayer) || (firstPlayer === match.userId ? match.socket : socket);
        const secondPlayerSocket = userSockets.get(secondPlayer) || (secondPlayer === match.userId ? socket : match.socket);
        // --- Ensure both players join the matchId room ---
        if (firstPlayerSocket) firstPlayerSocket.join(matchId);
        if (secondPlayerSocket) secondPlayerSocket.join(matchId);
        // Debug log
        console.log('Emitting gameStart to:', {
          firstPlayer, firstPlayerSocket: !!firstPlayerSocket,
          secondPlayer, secondPlayerSocket: !!secondPlayerSocket
        });
        // Send gameStart to first player (their turn)
        if (gameId === 'chess') {
          // Always assign firstPlayer as white, secondPlayer as black
          const whitePlayer = firstPlayer;
          const blackPlayer = secondPlayer;
          
          // Check if Chess is properly loaded
          if (typeof Chess !== 'function') {
            console.error('[CHESS] Chess is not a constructor:', typeof Chess);
            throw new Error('Chess library not properly loaded');
          }
          
          // Create chess instance and update the existing gameState
          const chess = new Chess();
          gameState.chess = chess;
          gameState.fen = chess.fen();
          gameState.moveHistory = [];
          gameState.players = [whitePlayer, blackPlayer]; // [white, black]
          gameState.turn = 'w';
          gameState.timer = null;
          gameState.drawReason = null;
          gameState.player1 = whitePlayer;
          gameState.player2 = blackPlayer;
          userSockets.get(whitePlayer).emit('gameStart', {
            matchId,
            opponentId: blackPlayer,
            yourTurn: true,
            gameId,
            stake,
            walletMode,
            timeLimit: 30,
            color: 'white',
            player1Id: whitePlayer,
            player2Id: blackPlayer
          });
          userSockets.get(blackPlayer).emit('gameStart', {
            matchId,
            opponentId: whitePlayer,
            yourTurn: false,
            gameId,
            stake,
            walletMode,
            timeLimit: 30,
            color: 'black',
            player1Id: whitePlayer,
            player2Id: blackPlayer
          });
        } else {
          // For non-chess games, ensure the gameState has players array
          gameState.players = [firstPlayer, secondPlayer];
          gameState.currentTurn = firstPlayer;
          
          firstPlayerSocket.emit('gameStart', {
            matchId,
            opponentId: secondPlayer,
            yourTurn: true,
            gameId,
            stake,
            walletMode,
            timeLimit: 30,
            diamondPosition: gameState.diamondPosition
          });
          // Send gameStart to second player (not their turn)
          secondPlayerSocket.emit('gameStart', {
            matchId,
            opponentId: firstPlayer,
            yourTurn: false,
            gameId,
            stake,
            walletMode,
            timeLimit: 30,
            diamondPosition: gameState.diamondPosition
          });
        }
        // Start turn timer for first player
        startTurnTimer(matchId, firstPlayer);
        console.log(`[MATCH] ${firstPlayer} vs ${secondPlayer} | gameId=${gameId} stake=${stake} walletMode=${walletMode} | First player: ${firstPlayer}`);
      } catch (err) {
        // Handle insufficient balance or transaction error
        console.error('[MATCHMAKING] Error creating match:', err.message);
        socket.emit('error', { message: err.message || 'Failed to create match. Please check your balance.' });
        if (match.socket) {
          match.socket.emit('error', { message: err.message || 'Failed to create match. Please check your balance.' });
        }
      }
    } else {
      // Add to queue
      matchmakingQueue.push({ 
        socket, 
        userId: socket.userId, 
        gameId, 
        walletMode, 
        stake,
        joinedAt: new Date()
      });
      socket.emit('queueWaiting');
      console.log(`[QUEUE] User ${socket.userId} waiting for match: gameId=${gameId} stake=${stake} walletMode=${walletMode}`);
      console.log(`[QUEUE] Total in queue: ${matchmakingQueue.length}`);
    }
    // Broadcast queue stats
    broadcastQueueStats();
  });

  socket.on('cancelQueue', () => {
    console.log(`[CANCEL] User ${socket.userId} cancelling queue`);
    
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (matchmakingQueue[i].userId === socket.userId) {
        matchmakingQueue.splice(i, 1);
      }
    }
    
    socket.emit('queueCancelled');
    console.log(`[CANCEL] User ${socket.userId} cancelled matchmaking`);
    broadcastQueueStats();
  });

  // Game invitation system
  socket.on('gameInvite', async (data) => {
    const { toUserId, fromUserId, gameType, message } = data;
    console.log(`[INVITE] User ${fromUserId} inviting ${toUserId} to play ${gameType}`);
    
    try {
      // Get the sender's username
      const sender = await prisma.user.findUnique({
        where: { id: fromUserId },
        select: { username: true }
      });
      
      if (!sender) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      // Send invitation to the target user
      const targetSocket = userSockets.get(toUserId);
      if (targetSocket) {
        targetSocket.emit('gameInvite', {
          fromUserId,
          fromUsername: sender.username,
          gameType,
          message
        });
        console.log(`[INVITE] Sent game invitation from ${sender.username} to ${toUserId}`);
      } else {
        console.log(`[INVITE] Target user ${toUserId} is offline`);
        socket.emit('error', { message: 'User is offline' });
      }
    } catch (error) {
      console.error('[INVITE] Error sending game invitation:', error);
      socket.emit('error', { message: 'Failed to send invitation' });
    }
  });

  socket.on('inviteResponse', async (data) => {
    const { toUserId, accepted, gameType } = data;
    console.log(`[INVITE] User ${socket.userId} ${accepted ? 'accepted' : 'declined'} invitation from ${toUserId}`);
    
    try {
      // Notify the inviter
      const inviterSocket = userSockets.get(toUserId);
      if (inviterSocket) {
        inviterSocket.emit('inviteResponse', {
          toUserId: socket.userId,
          accepted,
          gameType
        });
        
        if (accepted) {
          console.log(`[INVITE] Starting match between ${toUserId} and ${socket.userId} for ${gameType}`);
          // Create a direct match between the two players
          const matchId = `match_${Date.now()}_${matchCounter++}`;
          const firstPlayer = toUserId;
          const secondPlayer = socket.userId;
          
          // Create game state
          const gameState = new GameState(matchId, gameType, firstPlayer, secondPlayer, 100, 'virtual'); // Default stake and wallet mode
          gameState.currentTurn = firstPlayer;
          activeGames.set(matchId, gameState);
          
          // Emit game start to both players
          const firstPlayerSocket = userSockets.get(firstPlayer);
          const secondPlayerSocket = userSockets.get(secondPlayer);
          
          if (firstPlayerSocket) {
            firstPlayerSocket.emit('gameStart', {
              matchId,
              opponentId: secondPlayer,
              yourTurn: true,
              gameId: gameType,
              stake: 100,
              walletMode: 'virtual',
              timeLimit: 30
            });
          }
          
          if (secondPlayerSocket) {
            secondPlayerSocket.emit('gameStart', {
              matchId,
              opponentId: firstPlayer,
              yourTurn: false,
              gameId: gameType,
              stake: 100,
              walletMode: 'virtual',
              timeLimit: 30
            });
          }
          
          // Start turn timer
          startTurnTimer(matchId, firstPlayer);
          console.log(`[MATCH] Direct match started: ${firstPlayer} vs ${secondPlayer} | gameId=${gameType}`);
        }
      }
    } catch (error) {
      console.error('[INVITE] Error handling invitation response:', error);
    }
  });

  // --- PATCH: Real-time move and turn synchronization for all 1v1 games ---
  // Helper to get sockets
  function getPlayerSockets(player1, player2) {
    return [userSockets.get(player1), userSockets.get(player2)];
  }

  // --- New turn-based move system ---
  function emitMoveAndTurn(matchId, move, gameState, lastMoveBy) {
    const { player1, player2, currentTurn, board } = gameState;
    const playerSocket = userSockets.get(player1);
    const opponentSocket = userSockets.get(player2);
    const movePayload = {
      matchId,
      move,
      board: gameState.board,
      currentTurn: gameState.currentTurn,
      currentTurnPlayerId: gameState.currentTurn,
      lastMoveBy,
    };
    if (playerSocket) playerSocket.emit('moveMade', movePayload);
    if (opponentSocket) opponentSocket.emit('moveMade', movePayload);
    // Emit yourTurn to the next player (opponent)
    const nextSocket = userSockets.get(gameState.currentTurn);
    if (nextSocket) nextSocket.emit('yourTurn', {
      matchId,
      yourTurn: true,
      move,
      gameType: gameState.gameId,
      board: gameState.board,
      opponentId: socket.userId,
      currentTurn: gameState.currentTurn,
      currentTurnPlayerId: gameState.currentTurn
    });
    // Logging
    console.log(`[MOVE] ${lastMoveBy} -> ${gameState.currentTurn} | move:`, move);
    console.log(`[STATE] Board:`, gameState.board, `Current turn: ${gameState.currentTurn}`);
  }

  socket.on('makeMove', async (data) => {
    const { matchId, move, gameType } = data;
    console.log(`[MOVE] Move received from ${socket.userId}:`, move, `gameType:`, gameType);
    let gameState = activeGames.get(matchId);
    if (!gameState || gameState.gameEnded) {
      socket.emit('error', { message: 'Game not found or has ended' });
      return;
    }
    
    // Handle Dice Battle moves
    if (gameType === 'dice_battle') {
      console.log(`[DICE_BATTLE] Move received from ${socket.userId}:`, move);
      // Initialize dice battle state if not exists
      if (!gameState.diceBattleState) {
        gameState.diceBattleState = {
          round: 1,
          maxRounds: 5,
          playerRolls: {}, // { playerId: { dice: [1,2], total: 3, rolled: true } }
          roundScores: { [gameState.player1]: 0, [gameState.player2]: 0 }, // Wins per player
          roundHistory: [], // Array of round results
          currentRoundComplete: false,
          gameOver: false,
          winner: null
        };
      }
      const diceState = gameState.diceBattleState;
      // Check if player already rolled this round
      if (diceState.playerRolls[socket.userId] && diceState.playerRolls[socket.userId].rolled) {
        socket.emit('error', { message: 'Already rolled this round' });
        return;
      }
      // Get dice values from the move
      const dice = move.dice || [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      const total = dice.reduce((sum, die) => sum + die, 0);
      console.log(`[DICE_BATTLE] Player ${socket.userId} rolled:`, dice, 'Total:', total);
      // Store the roll for this player
      diceState.playerRolls[socket.userId] = {
        dice,
        total,
        rolled: true
      };
      // Emit moveMade to both players with the latest roll and full board state
      const [playerSocket, opponentSocket] = getPlayerSockets(gameState.player1, gameState.player2);
      const movePayload = {
        matchId,
        gameType: 'dice_battle',
        round: diceState.round,
        playerId: socket.userId,
        dice,
        total,
        playerRolls: diceState.playerRolls,
        roundScores: diceState.roundScores,
        roundHistory: diceState.roundHistory,
        roundComplete: false,
        gameOver: false
      };
      if (playerSocket) playerSocket.emit('moveMade', movePayload);
      if (opponentSocket) opponentSocket.emit('moveMade', movePayload);
      // Check if both players have rolled
      const bothRolled = diceState.playerRolls[gameState.player1] && 
                        diceState.playerRolls[gameState.player1].rolled &&
                        diceState.playerRolls[gameState.player2] && 
                        diceState.playerRolls[gameState.player2].rolled;
      if (bothRolled) {
        // Both players rolled - determine round winner
        const player1Total = diceState.playerRolls[gameState.player1].total;
        const player2Total = diceState.playerRolls[gameState.player2].total;
        let roundWinner = null;
        let roundResult = 'draw';
        if (player1Total > player2Total) {
          roundWinner = gameState.player1;
          roundResult = 'player1_win';
          diceState.roundScores[gameState.player1]++;
        } else if (player2Total > player1Total) {
          roundWinner = gameState.player2;
          roundResult = 'player2_win';
          diceState.roundScores[gameState.player2]++;
        }
        // Store round history
        diceState.roundHistory.push({
          round: diceState.round,
          player1Roll: diceState.playerRolls[gameState.player1].dice,
          player2Roll: diceState.playerRolls[gameState.player2].dice,
          player1Total,
          player2Total,
          winner: roundWinner,
          result: roundResult
        });
        // Prepare round result payload
        const player1Wins = diceState.roundScores[gameState.player1];
        const player2Wins = diceState.roundScores[gameState.player2];
        const roundResultPayload = {
          matchId,
          gameType: 'dice_battle',
          roundComplete: true,
          gameOver: false,
          round: diceState.round,
          currentScore: {
            [gameState.player1]: player1Wins,
            [gameState.player2]: player2Wins
          },
          roundResult: {
            player1Roll: diceState.roundHistory[diceState.roundHistory.length-1].player1Roll,
            player2Roll: diceState.roundHistory[diceState.roundHistory.length-1].player2Roll,
            player1Total,
            player2Total,
            winner: roundWinner,
            result: roundResult
          },
          nextRound: diceState.round + 1,
          roundHistory: diceState.roundHistory
        };
        if (playerSocket) playerSocket.emit('moveMade', roundResultPayload);
        if (opponentSocket) opponentSocket.emit('moveMade', roundResultPayload);
        // --- FIX: End game immediately if a player reaches 3 wins ---
        if (player1Wins >= 3 || player2Wins >= 3) {
          diceState.gameOver = true;
          let matchWinner = null;
          if (player1Wins > player2Wins) {
            matchWinner = gameState.player1;
          } else if (player2Wins > player1Wins) {
            matchWinner = gameState.player2;
          } // else draw (should not happen here)
          diceState.winner = matchWinner;
          gameState.gameEnded = true;
          gameState.winner = matchWinner;
          // Emit matchEnded to both
          const matchEndedPayload = {
            matchId,
            winner: matchWinner,
            reason: 'first_to_3',
            finalScore: {
              [gameState.player1]: player1Wins,
              [gameState.player2]: player2Wins
            },
            roundHistory: diceState.roundHistory
          };
          if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
          if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
          // Handle payout if there's a winner
          if (matchWinner) {
            try {
              await prisma.$transaction(async (tx) => {
                await payoutWinnings(tx, matchWinner, gameState.stake, gameState.walletMode);
              });
            } catch (err) {
              console.error(`[PAYOUT ERROR] Could not pay out winnings to ${matchWinner}:`, err);
            }
          }
        } else if (diceState.round >= diceState.maxRounds) {
          // Game is over after 5 rounds
          diceState.gameOver = true;
          let matchWinner = null;
          if (player1Wins > player2Wins) {
            matchWinner = gameState.player1;
          } else if (player2Wins > player1Wins) {
            matchWinner = gameState.player2;
          } // else draw
          diceState.winner = matchWinner;
          gameState.gameEnded = true;
          gameState.winner = matchWinner;
          // Emit matchEnded to both
          const matchEndedPayload = {
            matchId,
            winner: matchWinner,
            reason: 'max_rounds',
            finalScore: {
              [gameState.player1]: player1Wins,
              [gameState.player2]: player2Wins
            },
            roundHistory: diceState.roundHistory
          };
          if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
          if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
          // Handle payout if there's a winner
          if (matchWinner) {
            try {
              await prisma.$transaction(async (tx) => {
                await payoutWinnings(tx, matchWinner, gameState.stake, gameState.walletMode);
              });
            } catch (err) {
              console.error(`[PAYOUT ERROR] Could not pay out winnings to ${matchWinner}:`, err);
            }
          }
        } else {
          // Prepare for next round
          diceState.round++;
          diceState.currentRoundComplete = true;
          diceState.playerRolls = {};
          // Emit yourTurn to the next player (alternate turns)
          const nextPlayer = diceState.round % 2 === 1 ? gameState.player1 : gameState.player2;
          if (userSockets.get(nextPlayer)) {
            userSockets.get(nextPlayer).emit('yourTurn', {
              matchId,
              yourTurn: true,
              round: diceState.round,
              gameType: 'dice_battle',
              roundScores: diceState.roundScores,
              roundHistory: diceState.roundHistory
            });
          }
        }
      } else {
        // Only one player has rolled - emit yourTurn to the other player
        const nextPlayer = gameState.player1 === socket.userId ? gameState.player2 : gameState.player1;
        if (userSockets.get(nextPlayer)) {
          userSockets.get(nextPlayer).emit('yourTurn', {
            matchId,
            yourTurn: true,
            round: diceState.round,
            gameType: 'dice_battle',
            roundScores: diceState.roundScores,
            roundHistory: diceState.roundHistory
          });
        }
      }
      return;
    }
    
    // Handle Connect Four moves
    if (gameType === 'connect_four') {
      console.log(`[CONNECT_FOUR] Move received from ${socket.userId}:`, move);
      
      // Check if it's the player's turn
      if (gameState.currentTurn !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      
      const { column } = move;
      if (column < 0 || column > 6) {
        socket.emit('error', { message: 'Invalid column' });
        return;
      }
      
      // Find the lowest empty row in the column
      let placed = false;
      let row = 5;
      for (; row >= 0; row--) {
        if (!gameState.board[row][column]) {
          gameState.board[row][column] = gameState.currentTurn === gameState.player1 ? 1 : 2;
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        socket.emit('error', { message: 'Column full' });
        return;
      }
      
      // Check for winner
      const winner = checkConnectFourWinner(gameState.board);
      console.log(`[CONNECT_FOUR] Board after move:`, JSON.stringify(gameState.board));
      console.log(`[CONNECT_FOUR] Winner check result:`, winner);
      let gameEnded = false;
      let winnerId = null;
      
      if (winner) {
        winnerId = winner === 1 ? gameState.player1 : gameState.player2;
        gameEnded = true;
        console.log(`[CONNECT_FOUR] Game ended! Winner: ${winnerId} (player ${winner})`);
      } else if (gameState.board.every(row => row.every(cell => cell))) {
        // Draw - all cells filled
        gameEnded = true;
        console.log(`[CONNECT_FOUR] Game ended in draw!`);
      }
      
      // Clear current turn timer
      clearTurnTimer(matchId);
      
      // Switch turns if game hasn't ended
      if (!gameEnded) {
        gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        // Start timer for next player
        startTurnTimer(matchId, gameState.currentTurn);
      } else {
        gameState.gameEnded = true;
        gameState.winner = winnerId;
      }
      
      // Emit move to both players
      const [playerSocket, opponentSocket] = getPlayerSockets(gameState.player1, gameState.player2);
      const movePayload = {
        matchId,
        move: { row, column, player: socket.userId === gameState.player1 ? 1 : 2 }, // Send the player who made the move
        board: gameState.board,
        currentTurnPlayerId: gameState.currentTurn,
        gameEnded,
        winnerId
      };
      
      if (playerSocket) playerSocket.emit('moveMade', movePayload);
      if (opponentSocket) opponentSocket.emit('moveMade', movePayload);
      
      // Emit turn events
      if (!gameEnded) {
        if (userSockets.get(gameState.currentTurn)) {
          userSockets.get(gameState.currentTurn).emit('yourTurn', { 
            matchId, 
            yourTurn: true,
            currentTurnPlayerId: gameState.currentTurn,
            gameType: 'connect_four'
          });
        }
        const prevPlayer = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        if (userSockets.get(prevPlayer)) {
          userSockets.get(prevPlayer).emit('yourTurn', { 
            matchId, 
            yourTurn: false,
            currentTurnPlayerId: gameState.currentTurn,
            gameType: 'connect_four'
          });
        }
      } else {
        // Game ended - handle payout and emit match ended
        if (winnerId) {
          try {
            await prisma.$transaction(async (tx) => {
              await payoutWinnings(tx, winnerId, gameState.stake, gameState.walletMode);
            });
          } catch (err) {
            console.error(`[PAYOUT ERROR] Could not pay out winnings to ${winnerId}:`, err);
          }
        }
        
        const matchEndedPayload = {
          matchId,
          winner: winnerId,
          reason: winnerId ? 'win' : 'draw'
        };
        if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
        if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
      }
      
      return;
    }
    
    // Handle Diamond Hunt moves
    if (gameType === 'diamond_hunt') {
      console.log(`[DIAMOND] Move received from ${socket.userId}:`, move);
      
      // Check if it's the player's turn
      if (gameState.currentTurn !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      
      const { row, col } = move;
      if (row < 0 || row > 4 || col < 0 || col > 4) {
        socket.emit('error', { message: 'Invalid position' });
        return;
      }
      
      // Initialize revealed array if it doesn't exist
      if (!gameState.revealed) {
        gameState.revealed = Array(5).fill(null).map(() => Array(5).fill(false));
      }
      
      // Reveal the cell
      gameState.revealed[row][col] = true;
      
      // Check if player found the diamond
      let gameEnded = false;
      let winnerId = null;
      
      if (gameState.diamondPosition && row === gameState.diamondPosition.row && col === gameState.diamondPosition.col) {
        winnerId = socket.userId;
        gameEnded = true;
      }
      
      // Clear current turn timer
      clearTurnTimer(matchId);
      
      // Switch turns if game hasn't ended
      if (!gameEnded) {
        gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        // Start timer for next player
        startTurnTimer(matchId, gameState.currentTurn);
      } else {
        gameState.gameEnded = true;
        gameState.winner = winnerId;
      }
      
      // Emit move to both players
      const [playerSocket, opponentSocket] = getPlayerSockets(gameState.player1, gameState.player2);
      const movePayload = {
        matchId,
        move: { row, col },
        revealed: gameState.revealed,
        currentTurnPlayerId: gameState.currentTurn,
        gameEnded,
        winnerId
      };
      
      if (playerSocket) playerSocket.emit('moveMade', movePayload);
      if (opponentSocket) opponentSocket.emit('moveMade', movePayload);
      
      // Emit turn events
      if (!gameEnded) {
        if (userSockets.get(gameState.currentTurn)) {
          userSockets.get(gameState.currentTurn).emit('yourTurn', { 
            matchId, 
            yourTurn: true,
            currentTurnPlayerId: gameState.currentTurn,
            gameType: 'diamond_hunt',
            revealed: gameState.revealed
          });
        }
        const prevPlayer = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        if (userSockets.get(prevPlayer)) {
          userSockets.get(prevPlayer).emit('yourTurn', { 
            matchId, 
            yourTurn: false,
            currentTurnPlayerId: gameState.currentTurn,
            gameType: 'diamond_hunt',
            revealed: gameState.revealed
          });
        }
      } else {
        // Game ended
        const matchEndedPayload = {
          matchId,
          winner: winnerId,
          reason: 'diamond_found'
        };
        if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
        if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
      }
      
      return;
    }
    
    // Handle TicTacToe 5x5 moves
    if (gameType === 'tictactoe5x5' || gameType === 'tic_tac_toe_5x5' || gameType === 'TIC_TAC_TOE_5X5' || 
        gameType === 'tictactoe-5x5' || gameType === 'tic-tac-toe-5x5' || gameType === 'TICTACTOE5X5' ||
        gameType === 'tictactoe_5x5' || gameType === 'tic_tac_toe5x5') {
      console.log(`[TICTACTOE5X5] Move received from ${socket.userId}:`, move);
      console.log(`[TICTACTOE5X5] Current gameState.gameEnded:`, gameState.gameEnded);
      
      // BLOCK MOVES IF GAME HAS ENDED - CRITICAL CHECK
      if (gameState.gameEnded) {
        console.log(`[TICTACTOE5X5] ❌ Move blocked: Game has already ended`);
        socket.emit('error', { message: 'Game has already ended' });
        return;
      }
      
      // Check if it's the player's turn
      if (gameState.currentTurn !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      
      const { index } = move;
      if (index < 0 || index > 24) {
        socket.emit('error', { message: 'Invalid position' });
        return;
      }
      
      // Convert index to row and col
      const row = Math.floor(index / 5);
      const col = index % 5;
      
      // Check if cell is already taken
      if (gameState.board[row][col] !== null) {
        socket.emit('error', { message: 'Cell already taken' });
        return;
      }
      
      // Determine player symbol (X or O)
      const symbol = gameState.currentTurn === gameState.player1 ? 'X' : 'O';
      
      // Make the move
      gameState.board[row][col] = symbol;
      
      // Check for winner
      let gameEnded = false;
      let winnerId = null;
      
      // Check rows, columns, and diagonals for 4-in-a-row
      const winner = checkTicTacToe5x5Winner(gameState.board);
      console.log(`[TICTACTOE5X5] Winner check result:`, winner, `Board:`, gameState.board);
      
      if (winner) {
        winnerId = winner === 'X' ? gameState.player1 : gameState.player2;
        gameEnded = true;
        console.log(`[TICTACTOE5X5] Game ended! Winner: ${winnerId} (${winner})`);
        // SET GAME ENDED IMMEDIATELY - CRITICAL FIX
        gameState.gameEnded = true;
        gameState.winner = winnerId;
        console.log(`[TICTACTOE5X5] ✅ gameState.gameEnded set to true immediately`);
      } else {
        // Check for draw (all cells filled)
        const isDraw = gameState.board.every(row => row.every(cell => cell !== null));
        if (isDraw) {
          gameEnded = true;
          winnerId = null; // Draw
          console.log(`[TICTACTOE5X5] Game ended! Draw - all cells filled`);
          // SET GAME ENDED IMMEDIATELY - CRITICAL FIX
          gameState.gameEnded = true;
          gameState.winner = winnerId;
          console.log(`[TICTACTOE5X5] ✅ gameState.gameEnded set to true immediately (draw)`);
        }
      }
      
      // Clear current turn timer
      clearTurnTimer(matchId);
      
      // Switch turns if game hasn't ended
      if (!gameEnded) {
        gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        // Start timer for next player
        startTurnTimer(matchId, gameState.currentTurn);
      }
      
      // Emit move to both players
      const [playerSocket, opponentSocket] = getPlayerSockets(gameState.player1, gameState.player2);
      // Always send board as 1D array for frontend compatibility
      const flatBoard = Array.isArray(gameState.board[0]) ? gameState.board.flat() : gameState.board;
      const movePayload = {
        matchId,
        move: { index, row, col },
        board: flatBoard,
        currentTurnPlayerId: gameState.currentTurn,
        gameEnded,
        winnerId
      };
      
      if (playerSocket) playerSocket.emit('moveMade', movePayload);
      if (opponentSocket) opponentSocket.emit('moveMade', movePayload);
      
      // Emit turn events
      if (!gameEnded) {
        if (userSockets.get(gameState.currentTurn)) {
          userSockets.get(gameState.currentTurn).emit('yourTurn', { 
            matchId, 
            yourTurn: true,
            currentTurnPlayerId: gameState.currentTurn,
            gameType: 'tictactoe5x5',
            board: flatBoard
          });
        }
        const prevPlayer = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
        if (userSockets.get(prevPlayer)) {
          userSockets.get(prevPlayer).emit('yourTurn', { 
            matchId, 
            yourTurn: false,
            currentTurnPlayerId: gameState.currentTurn,
            gameType: 'tictactoe5x5',
            board: flatBoard
          });
        }
      } else {
        // Game ended
        console.log(`[TICTACTOE5X5] Game ended! Winner: ${winnerId}, Reason: ${winnerId ? 'winner' : 'draw'}`);
        
        if (winnerId) {
          try {
            await prisma.$transaction(async (tx) => {
              await payoutWinnings(tx, winnerId, gameState.stake, gameState.walletMode);
            });
          } catch (err) {
            console.error(`[PAYOUT ERROR] Could not pay out winnings to ${winnerId}:`, err);
          }
        }
        
        const matchEndedPayload = {
          matchId,
          winner: winnerId,
          reason: winnerId ? 'winner' : 'draw'
        };
        
        console.log(`[TICTACTOE5X5] Sending matchEnded to players:`, {
          player1: gameState.player1,
          player2: gameState.player2,
          playerSocket: !!playerSocket,
          opponentSocket: !!opponentSocket,
          payload: matchEndedPayload
        });
        
        // Emit gameOver event to both players
        if (playerSocket) {
          playerSocket.emit('gameOver', {
            matchId,
            winner: winnerId,
            winnerId: winnerId,
            gameType: 'tictactoe5x5',
            result: winnerId ? 'winner' : 'draw',
            opponentId: gameState.player2
          });
          playerSocket.emit('matchEnded', matchEndedPayload);
          console.log(`[TICTACTOE5X5] gameOver + matchEnded sent to player1: ${gameState.player1}`);
        } else {
          console.log(`[TICTACTOE5X5] ERROR: No socket found for player1: ${gameState.player1}`);
        }
        
        if (opponentSocket) {
          opponentSocket.emit('gameOver', {
            matchId,
            winner: winnerId,
            winnerId: winnerId,
            gameType: 'tictactoe5x5',
            result: winnerId ? 'winner' : 'draw',
            opponentId: gameState.player1
          });
          opponentSocket.emit('matchEnded', matchEndedPayload);
          console.log(`[TICTACTOE5X5] gameOver + matchEnded sent to player2: ${gameState.player2}`);
        } else {
          console.log(`[TICTACTOE5X5] ERROR: No socket found for player2: ${gameState.player2}`);
        }
      }
    }
    
    if (gameType === 'chess') {
      // Patch: Ensure chess is a real Chess instance
      if (!gameState.chess || typeof gameState.chess.move !== 'function') {
        try {
          gameState.chess = new Chess(gameState.fen || undefined);
          console.log(`[CHESS] Recreated chess instance with FEN: ${gameState.chess.fen()}`);
        } catch (error) {
          console.error(`[CHESS] Error creating chess instance:`, error);
          gameState.chess = new Chess(); // Start fresh
        }
      }
      
      const { chess, players } = gameState;
      
      // Verify chess instance is valid
      if (!chess || typeof chess.move !== 'function') {
        console.error(`[CHESS] Invalid chess instance for match ${matchId}`);
        socket.emit('error', { message: 'Game state error' });
        return;
      }
      
      // Only allow if it's the player's turn
      const color = chess.turn();
      const playerIndex = color === 'w' ? 0 : 1;
      if (players[playerIndex] !== socket.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      
      // Try the move - only add promotion if it's a pawn promotion
      const moveObj = { from: move.from, to: move.to };
      // Detect if this is a pawn promotion
      const isPawnPromotion = (() => {
        if (!chess) return false;
        const piece = chess.get(move.from);
        if (!piece || piece.type !== 'p') return false;
        const toRank = parseInt(move.to[1], 10);
        return (piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1);
      })();
      if (isPawnPromotion) {
        if (!move.promotion || !['q','r','b','n'].includes(move.promotion)) {
          socket.emit('promotionRequired', { from: move.from, to: move.to });
          return;
        }
        moveObj.promotion = move.promotion;
      } else if (move.promotion) {
        moveObj.promotion = move.promotion;
      }
      let result;
      try {
        result = chess.move(moveObj);
        if (!result) {
          socket.emit('error', { message: 'Illegal move' });
          return;
        }
      } catch (err) {
        console.error('[CHESS] Move error:', err);
        socket.emit('error', { message: 'Invalid move' });
        return;
      }
      
      console.log(`[CHESS] Move successful:`, result);
      gameState.fen = chess.fen();
      gameState.moveHistory.push(result);
      
      // Check for end conditions with proper error handling
      let isCheck = false;
      let isCheckmate = false;
      let isStalemate = false;
      let isDraw = false;
      let drawReason = null;
      
      try {
        isCheck = chess.isCheck();
        isCheckmate = chess.isCheckmate();
        isStalemate = chess.isStalemate();
        isDraw = chess.isDraw();
        
        if (isDraw) {
          if (chess.isInsufficientMaterial()) drawReason = 'insufficient_material';
          else if (chess.isThreefoldRepetition()) drawReason = 'threefold_repetition';
          else if (chess.isStalemate()) drawReason = 'stalemate';
          else if (chess.isDraw()) drawReason = '50-move-rule';
        }
      } catch (error) {
        console.error(`[CHESS] Error checking game state:`, error);
        // Continue with default values
      }
      
      // Clear current turn timer
      clearTurnTimer(matchId);
      
      // After a successful move:
      const nextTurn = chess.turn(); // 'w' or 'b'
      const nextPlayerIndex = nextTurn === 'w' ? 0 : 1;
      const nextPlayerId = players[nextPlayerIndex];
      gameState.currentTurn = nextPlayerId; // Store whose turn it is
      
      // Start timer for next player
      startTurnTimer(matchId, nextPlayerId);

      // Convert FEN to board mapping for frontend
      function fenToBoard(fen) {
        const [position] = fen.split(' ');
        const rows = position.split('/');
        const files = ['a','b','c','d','e','f','g','h'];
        const board = {};
        for (let r = 0; r < 8; r++) {
          let fileIdx = 0;
          for (const char of rows[r]) {
            if (Number.isInteger(Number(char))) {
              for (let i = 0; i < Number(char); i++) {
                const square = files[fileIdx] + (8 - r);
                board[square] = { piece: null, position: square };
                fileIdx++;
              }
            } else {
              const color = char === char.toUpperCase() ? 'white' : 'black';
              let type;
              switch (char.toLowerCase()) {
                case 'p': type = 'pawn'; break;
                case 'r': type = 'rook'; break;
                case 'n': type = 'knight'; break;
                case 'b': type = 'bishop'; break;
                case 'q': type = 'queen'; break;
                case 'k': type = 'king'; break;
                default: type = 'pawn';
              }
              const square = files[fileIdx] + (8 - r);
              board[square] = { piece: { type, color }, position: square };
              fileIdx++;
            }
          }
        }
        // Fill empty squares (redundant, but safe)
        for (const file of files) {
          for (let rank = 1; rank <= 8; rank++) {
            const sq = file + rank;
            if (!board[sq]) board[sq] = { piece: null, position: sq };
          }
        }
        return board;
      }

      const payload = {
        matchId,
        move: result,
        fen: chess.fen(),
        turn: chess.turn(),
        isCheck,
        isCheckmate,
        isStalemate,
        isDraw,
        drawReason,
        nextPlayerId, // Add this!
        board: fenToBoard(chess.fen()), // Add board mapping for frontend
      };

      // Emit moveMade to both players
      const [playerSocket, opponentSocket] = getPlayerSockets(players[0], players[1]);
      [playerSocket, opponentSocket].forEach(sock => {
        if (sock) sock.emit('moveMade', payload);
      });

      // Emit yourTurn events
      if (userSockets.get(nextPlayerId)) {
        userSockets.get(nextPlayerId).emit('yourTurn', { 
          matchId, 
          yourTurn: true,
          currentTurnPlayerId: nextPlayerId
        });
      }
      const prevPlayerId = players[1 - nextPlayerIndex];
      if (userSockets.get(prevPlayerId)) {
        userSockets.get(prevPlayerId).emit('yourTurn', { 
          matchId, 
          yourTurn: false,
          currentTurnPlayerId: nextPlayerId
        });
      }
      
      // If game ended
      if (isCheckmate || isStalemate || isDraw) {
        console.log(`[CHESS] Game ended: checkmate=${isCheckmate}, stalemate=${isStalemate}, draw=${isDraw}`);
        const winner = isCheckmate ? (chess.turn() === 'w' ? 'black' : 'white') : 'draw';
        const winnerId = winner === 'draw' ? null : (winner === 'white' ? players[0] : players[1]);
        
        // Emit match ended to both players
        const matchEndedPayload = {
          matchId,
          winner: winnerId,
          reason: isCheckmate ? 'checkmate' : isStalemate ? 'stalemate' : drawReason || 'draw'
        };
        
        if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
        if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
        
        // Handle game end logic
        if (winnerId) {
          console.log(`[CHESS] Winner: ${winnerId}`);
          // Update game state
          gameState.gameEnded = true;
          gameState.winner = winnerId;
        }
      }
    }
  });

  // Game end event
  socket.on('gameEnd', async (data) => {
    const { matchId, winner, gameType, result } = data;
    gameState = activeGames.get(matchId);
    
    if (!gameState) {
      console.log(`[ERROR] Game ${matchId} not found for gameEnd`);
      return;
    }
    
    console.log(`[GAME_END] ${gameType} match ${matchId} ended. Winner: ${winner}`);
    
    // Update game state
    gameState.gameEnded = true;
    gameState.winner = winner;
    
    // Clear timer
    clearTurnTimer(matchId);
    
    // Determine opponent
    const opponentId = socket.userId === gameState.player1 ? gameState.player2 : gameState.player1;
    const opponentSocket = userSockets.get(opponentId);

    // Payout winner
    if (!winner || typeof gameState.stake !== 'number' || isNaN(gameState.stake) || gameState.stake <= 0 || !gameState.walletMode) {
      console.error('[GAME_END] Invalid payout parameters:', {
        matchId,
        winner,
        stake: gameState.stake,
        walletMode: gameState.walletMode,
        gameType
      });
    } else {
      try {
        await prisma.$transaction(async (tx) => {
          await payoutWinnings(tx, winner, gameState.stake, gameState.walletMode);
        });
      } catch (err) {
        console.error(`[GAME_END] payoutWinnings failed for match ${matchId}:`, err.message);
        return;
      }
    }

    if (opponentSocket) {
      opponentSocket.emit('gameOver', {
        matchId,
        winner,
        gameType,
        result,
        opponentId: socket.userId
      });
    }
    
    // Clean up game state after a delay
    setTimeout(() => {
      activeGames.delete(matchId);
      console.log(`[CLEANUP] Removed game state for ${matchId}`);
    }, 5000);
  });

  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT] User ${socket.userId} disconnected`);
    // Remove from queue
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (matchmakingQueue[i].userId === socket.userId) {
        matchmakingQueue.splice(i, 1);
      }
    }
    // Handle active games
    for (const [matchId, gameState] of activeGames.entries()) {
      if (gameState.player1 === socket.userId || gameState.player2 === socket.userId) {
        if (!gameState.gameEnded) {
          // Player disconnected during game - opponent wins
          const opponentId = gameState.player1 === socket.userId ? gameState.player2 : gameState.player1;
          const opponentSocket = userSockets.get(opponentId);
          if (opponentSocket) {
            opponentSocket.emit('gameOver', {
              matchId,
              winner: opponentId,
              gameType: gameState.gameId,
              result: 'opponent_disconnected',
              opponentId: socket.userId
            });
          }
          gameState.gameEnded = true;
          gameState.winner = opponentId;
          clearTurnTimer(matchId);
          console.log(`[DISCONNECT] Game ${matchId} ended due to ${socket.userId} disconnecting. Winner: ${opponentId}`);
        }
      }
    }
    console.log(`[DISCONNECT] Removed ${socket.userId} from queue`);
    broadcastQueueStats();
    // PATCH: Always keep userSockets up to date
    userSockets.delete(socket.userId);
    
    // --- Broadcast offline status to all connected users ---
    const onlineUserIds = Array.from(userSockets.keys());
    io.emit('online_users', onlineUserIds);
    io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
    console.log(`[STATUS] User ${socket.userId} is now offline. Total online: ${onlineUserIds.length}`);
    
    // --- Set user as offline in DB ---
    // try {
    //   await prisma.user.update({
    //     where: { id: socket.userId },
    //     data: { isActive: false }
    //   });
    // } catch (err) {
    //   console.error(`[SOCKET] Failed to set user ${socket.userId} as offline:`, err.message);
    // }
  });

  // --- Patch: Add resign event ---
  socket.on('resign', (data) => {
    const { matchId } = data;
    gameState = activeGames.get(matchId);
    if (!gameState || gameState.gameEnded) return;
    
    // Handle both old and new game state formats
    let players;
    if (gameState.players && Array.isArray(gameState.players)) {
      players = gameState.players;
    } else if (gameState.player1 && gameState.player2) {
      players = [gameState.player1, gameState.player2];
    } else {
      console.error(`[RESIGN] No valid players found for match ${matchId}`);
      return;
    }
    
    const opponentId = players.find(id => id !== socket.userId);
    if (!opponentId) {
      console.error(`[RESIGN] Could not find opponent for player ${socket.userId} in match ${matchId}`);
      return;
    }
    
    gameState.gameEnded = true;
    const [playerSocket, opponentSocket] = [userSockets.get(players[0]), userSockets.get(players[1])];
    if (playerSocket) playerSocket.emit('matchEnded', { matchId, winner: opponentId, reason: 'resignation' });
    if (opponentSocket) opponentSocket.emit('matchEnded', { matchId, winner: opponentId, reason: 'resignation' });
    clearTurnTimer(matchId);
    setTimeout(() => { activeGames.delete(matchId); }, 5000);
  });

  // --- Ephemeral Match Chat ---
  socket.on('chatMessage', (data) => {
    const { matchId, senderId, senderName, text } = data;
    if (!matchId || !senderId || !text) return;
    // Profanity filter (same as frontend)
    const profanityWords = [
      'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock',
      'pussy', 'cunt', 'whore', 'slut', 'bastard', 'motherfucker', 'fucker', 'shithead'
    ];
    const lowerText = text.toLowerCase();
    const containsProfanity = profanityWords.some(word => lowerText.includes(word));
    if (containsProfanity) {
      socket.emit('chatProfanityWarning', { message: '⚠️ Inappropriate language is not allowed.' });
      return;
    }
    // Word limit (100 words)
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 100) {
      socket.emit('chatWordLimitWarning', { message: 'Message too long. Maximum 100 words allowed.' });
      return;
    }
    // Relay to both players in the match room
    io.to(matchId).emit('chatMessage', {
      matchId,
      senderId,
      senderName,
      text
    });
  });
});

// Turn timer functions
function startTurnTimer(matchId, playerId) {
  const gameState = activeGames.get(matchId);
  if (!gameState) return;
  clearTurnTimer(matchId);
  const timer = setTimeout(() => {
    if (!gameState || gameState.gameEnded) return;
    
    let players;
    if (gameState.players && Array.isArray(gameState.players)) {
      players = gameState.players;
    } else if (gameState.player1 && gameState.player2) {
      players = [gameState.player1, gameState.player2];
    } else {
      console.error(`[TIMER] No valid players found for match ${matchId}`);
      return;
    }
    
    const opponentId = players.find(id => id !== playerId);
    if (!opponentId) {
      console.error(`[TIMER] Could not find opponent for player ${playerId} in match ${matchId}`);
      return;
    }
    
    // Handle dice battle timeout specifically
    if (gameState.gameId === 'dice_battle' && gameState.diceBattleState) {
      console.log(`[DICE_BATTLE_TIMEOUT] Player ${playerId} timed out in round ${gameState.diceBattleState.round}`);
      
      // Mark the game as ended due to timeout
      gameState.gameEnded = true;
      gameState.winner = opponentId;
      gameState.diceBattleState.gameOver = true;
      gameState.diceBattleState.winner = opponentId;
      
      // Emit timeout result to both players
      const [playerSocket, opponentSocket] = getPlayerSockets(players[0], players[1]);
      const timeoutResult = {
        matchId,
        gameType: 'dice_battle',
        roundComplete: false,
        gameOver: true,
        winner: opponentId,
        reason: 'timeout',
        timeoutPlayer: playerId,
        finalScore: gameState.diceBattleState.roundScores
      };
      
      if (playerSocket) playerSocket.emit('moveMade', timeoutResult);
      if (opponentSocket) opponentSocket.emit('moveMade', timeoutResult);
      
      // Emit match ended
      const matchEndedPayload = {
        matchId,
        winner: opponentId,
        reason: 'timeout',
        timeoutPlayer: playerId,
        finalScore: gameState.diceBattleState.roundScores
      };
      
      if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
      if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
      
      // Handle payout
      (async () => {
        try {
          await prisma.$transaction(async (tx) => {
            await payoutWinnings(tx, opponentId, gameState.walletMode, gameState.stake);
          });
        } catch (err) {
          console.error(`[PAYOUT ERROR] Could not pay out winnings to ${opponentId}:`, err);
        }
      })();
      
    } else if (gameState.gameId === 'chess') {
      // For chess, end the game and declare the opponent as winner if player times out
      gameState.gameEnded = true;
      gameState.winner = opponentId;
      const [playerSocket, opponentSocket] = [userSockets.get(players[0]), userSockets.get(players[1])];
      const matchEndedPayload = {
        matchId,
        winner: opponentId,
        reason: 'timeout',
        timeoutPlayer: playerId
      };
      if (playerSocket) playerSocket.emit('matchEnded', matchEndedPayload);
      if (opponentSocket) opponentSocket.emit('matchEnded', matchEndedPayload);
      // Optionally, payout winner
      (async () => {
        try {
          await prisma.$transaction(async (tx) => {
            await payoutWinnings(tx, opponentId, gameState.walletMode, gameState.stake);
          });
        } catch (err) {
          console.error(`[PAYOUT ERROR] Could not pay out winnings to ${opponentId}:`, err);
        }
      })();
      setTimeout(() => { activeGames.delete(matchId); }, 60000);
      return;
    } else {
      // Handle other games (existing logic)
      gameState.gameEnded = true;
      const [playerSocket, opponentSocket] = [userSockets.get(players[0]), userSockets.get(players[1])];
      if (playerSocket) playerSocket.emit('matchEnded', { matchId, winner: opponentId, reason: 'timeout' });
      if (opponentSocket) opponentSocket.emit('matchEnded', { matchId, winner: opponentId, reason: 'timeout' });
    }
    
    setTimeout(() => { activeGames.delete(matchId); }, 60000);
  }, 60000);
  if (gameState) gameState.timer = timer;
}

function clearTurnTimer(matchId) {
  const gameState = activeGames.get(matchId);
  if (gameState && gameState.timer) {
    clearTimeout(gameState.timer);
    gameState.timer = null;
  }
}

function broadcastQueueStats() {
  const stats = {};
  for (const entry of matchmakingQueue) {
    const key = `${entry.gameId}:${entry.walletMode}:${entry.stake}`;
    stats[key] = (stats[key] || 0) + 1;
  }
  io.emit('queueStats', stats);
  console.log(`[STATS] Queue stats:`, stats);
}

// Attach io and userSockets to app for use in routes/controllers
app.set('io', io);
app.set('userSockets', userSockets);

// Custom counter for suspicious activity
const suspiciousActivityCounter = new client.Counter({
  name: 'suspicious_activity_total',
  help: 'Total number of suspicious activities detected'
});

// Make suspiciousActivityCounter available to routes
app.set('suspiciousActivityCounter', suspiciousActivityCounter);

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
app.set('redis', redis);

// Rate limiting for matchmaking and game actions
const matchmakingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many matchmaking requests, please slow down.'
});
const gameActionLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 20, // 20 requests per 10 seconds per IP
  message: 'Too many game actions, please slow down.'
});

// Attach limiters to app for use in routes
app.set('matchmakingLimiter', matchmakingLimiter);
app.set('gameActionLimiter', gameActionLimiter);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
}).on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error('Port 3002 is already in use. Please stop other services or change the port.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

async function ensureAdminUser() {
  const adminEmail = "admin@chanspaw.com";
  const adminUsername = "admin";
  const adminPassword = "Chanspaw@2025!";

  const existingAdmin = await prisma.user.findFirst({ where: { isAdmin: true } });
  if (!existingAdmin) {
    const { hashPassword } = require('./utils/auth');
    const hashedPassword = await hashPassword(adminPassword);
    const users = await prisma.user.findMany({ select: { id: true } });
    const existingIds = new Set(users.map(u => u.id));
    const newId = await generateUserId(prisma);
    await prisma.user.create({
      data: {
        id: newId,
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true,
        isVerified: true,
        isActive: true,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUsername}`,
        real_balance: 0,
        virtual_balance: 0
      }
    });
    console.log("✅ Admin user created: admin@chanspaw.com / Chanspaw@2025!");
  }
}
ensureAdminUser();

// --- Persistence and Recovery for Matches and Queues ---
async function recoverInProgressMatchesAndQueues() {
  // Recover active matches
  const activeMatches = await prisma.match.findMany({
    where: { status: 'active' }
  });
  console.log(`[RECOVERY] Recovered ${activeMatches.length} active matches from DB.`);

  // Recover waiting matchmaking queue
  // const waitingQueue = await prisma.matchmakingQueue.findMany({
  //   where: { status: 'waiting' }
  // });
  // console.log(`[RECOVERY] Recovered ${waitingQueue.length} users in matchmaking queue from DB.`);

  // Optionally, you can re-initialize timers or notify users here
}

// --- Periodic Cleanup for Abandoned/Stuck Matches ---
async function cleanupStuckMatches() {
  try {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = new Date();
    // Find matches that have been active for more than 1 hour
    const stuckMatches = await prisma.match.findMany({
      where: {
        status: 'active',
        startedAt: { lt: new Date(now.getTime() - ONE_HOUR) }
      }
    });
    
    for (const match of stuckMatches) {
      try {
        // Check if both players still exist
        const player1 = await prisma.user.findUnique({ where: { id: match.player1Id } });
        const player2 = await prisma.user.findUnique({ where: { id: match.player2Id } });
        // Update match status
        await prisma.match.update({
          where: { id: match.id },
          data: { status: 'cancelled', completedAt: new Date() }
        });
        // Determine wallet field
        const balanceField = match.matchType === 'real' ? 'real_balance' : 'virtual_balance';
        // Refund both players if they exist
        for (const player of [player1, player2]) {
          if (player) {
            await prisma.user.update({
              where: { id: player.id },
              data: { [balanceField]: { increment: match.betAmount } }
            });
            await prisma.auditLog.create({
              data: {
                userId: player.id,
                action: 'ESCROW_REFUND',
                details: JSON.stringify({ matchId: match.id, amount: match.betAmount, reason: 'stuck_cleanup', wallet: balanceField })
              }
            });
            await prisma.transaction.create({
              data: {
                userId: player.id,
                type: 'REFUND',
                amount: match.betAmount,
                status: 'COMPLETED',
                description: `Refund for stuck match ${match.id}`,
                metadata: JSON.stringify({ matchId: match.id, wallet: balanceField })
              }
            });
          }
        }
        console.log(`[CLEANUP] Cleaned up stuck match ${match.id}`);
      } catch (error) {
        console.error(`[CLEANUP] Error cleaning up match ${match.id}:`, error.message);
      }
    }
    if (stuckMatches.length > 0) {
      console.log(`[CLEANUP] Cleaned up ${stuckMatches.length} stuck matches and refunded bets.`);
    }
  } catch (error) {
    console.error('[CLEANUP] Error in cleanupStuckMatches:', error.message);
  }
}

// Call recovery on server boot
recoverInProgressMatchesAndQueues();
// Run cleanup every 10 minutes
setInterval(cleanupStuckMatches, 10 * 60 * 1000);

function pad(num) {
  return String(num).padStart(3, '0');
}

async function generateUserId(prisma) {
  const users = await prisma.user.findMany({
    where: { id: { startsWith: 'CHS-' } },
    select: { id: true }
  });
  const numbers = users
    .map(u => {
      const match = u.id.match(/^CHS-(\d{3})-USR$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null)
    .sort((a, b) => a - b);
  let next = 1;
  while (numbers.includes(next)) next++;
  return `CHS-${pad(next)}-USR`;
}

function boardToFen(board, turn) {
  // Create a new chess.js instance
  const chess = new Chess();
  // Clear the board
  chess.clear();
  // Place pieces from our board array
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const type = piece.type[0]; // 'p','r','n','b','q','k'
        const color = piece.color[0]; // 'w' or 'b'
        const square = String.fromCharCode(97 + file) + (8 - rank);
        chess.put({ type, color }, square);
      }
    }
  }
  // Set turn
  chess.load(chess.fen().replace(/ [wb] /, ` ${turn} `));
  return chess.fen();
}

// Add payout API endpoint for microservices
app.post('/api/payout', async (req, res) => {
  const { winnerId, stake, walletMode } = req.body;
  console.log(`[PAYOUT] Request received: winnerId=${winnerId}, stake=${stake}, walletMode=${walletMode}`);
  if (!winnerId || !stake || !walletMode) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }
  try {
    await payoutWinnings(winnerId, stake, walletMode);
    console.log(`[PAYOUT] Success: winnerId=${winnerId}, stake=${stake}, walletMode=${walletMode}`);
    res.json({ success: true, message: 'Payout completed' });
  } catch (err) {
    console.error(`[PAYOUT ERROR] Could not pay out winnings to ${winnerId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { app, io, userSockets }; 
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const fetch = require('node-fetch');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage (replace with Redis/DB in production)
const activeGames = new Map();
const gameStates = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'chess-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    activeGames: activeGames.size
  });
});

// Game API endpoints
// Replace local match creation with backend call
app.post('/api/game/initialize', async (req, res) => {
  const { matchId, player1, player2, stake, walletMode } = req.body;
  if (!matchId || !player1 || !player2) {
    return res.status(400).json({ error: 'Missing required parameters' });
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
      return res.status(400).json({ error: backendData.error || 'Failed to create match' });
    }
    const gameState = {
      matchId,
      player1,
      player2,
      currentTurn: player1,
      board: initializeChessBoard(),
      moveHistory: [],
      capturedPieces: [],
      stake,
      walletMode,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    activeGames.set(matchId, gameState);
    gameStates.set(matchId, gameState);
    res.json({ success: true, gameState, message: 'Chess game initialized' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/game/move', (req, res) => {
  const { matchId, playerId, move } = req.body;
  
  const gameState = activeGames.get(matchId);
  if (!gameState) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (gameState.currentTurn !== playerId) {
    return res.status(400).json({ error: 'Not your turn' });
  }

  const moveResult = validateChessMove(gameState, move, playerId);
  if (!moveResult.valid) {
    return res.status(400).json({ error: moveResult.error });
  }

  // Apply move
  gameState.board = moveResult.newBoard;
  gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
  gameState.moveHistory.push(moveResult.moveData);

  // Check win condition
  const winResult = checkChessWinCondition(gameState);
  if (winResult.gameOver) {
    gameState.status = 'finished';
    gameState.winner = winResult.winner;
    (async () => {
      try {
        const payoutRes = await fetch('http://localhost:3002/api/payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: gameState.matchId,
            gameType: 'chess',
            player1Id: gameState.player1,
            player2Id: gameState.player2,
            winnerId: winResult.winner,
            betAmount: gameState.stake,
            currency: gameState.walletMode,
            isDraw: winResult.winner == null
          })
        });
        const payoutData = await payoutRes.json();
        console.log('Chess payout result', { matchId: gameState.matchId, winnerId: winResult.winner, payoutData });
      } catch (err) {
        console.error('Chess payout error', { matchId: gameState.matchId, winnerId: winResult.winner, error: err.message });
      }
    })();
  }

  activeGames.set(matchId, gameState);

  res.json({
    success: true,
    gameState,
    moveResult,
    winResult
  });
});

app.get('/api/game/:matchId', (req, res) => {
  const { matchId } = req.params;
  const gameState = activeGames.get(matchId);
  
  if (!gameState) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({
    success: true,
    gameState
  });
});

app.delete('/api/game/:matchId', (req, res) => {
  const { matchId } = req.params;
  
  if (activeGames.has(matchId)) {
    activeGames.delete(matchId);
    gameStates.delete(matchId);
  }

  res.json({
    success: true,
    message: 'Game cleaned up'
  });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log(`[CHESS] Client connected: ${socket.id}`);

  socket.on('joinGame', (matchId) => {
    socket.join(matchId);
    console.log(`[CHESS] Client ${socket.id} joined game ${matchId}`);
  });

  socket.on('makeMove', (data) => {
    const { matchId, playerId, move } = data;
    const gameState = activeGames.get(matchId);
    
    if (!gameState) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const moveResult = validateChessMove(gameState, move, playerId);
    if (moveResult.valid) {
      // Apply move and broadcast to all players in the game
      gameState.board = moveResult.newBoard;
      gameState.currentTurn = gameState.currentTurn === gameState.player1 ? gameState.player2 : gameState.player1;
      gameState.moveHistory.push(moveResult.moveData);

      const winResult = checkChessWinCondition(gameState);
      if (winResult.gameOver) {
        gameState.status = 'finished';
        gameState.winner = winResult.winner;
        (async () => {
          try {
            const payoutRes = await fetch('http://localhost:3002/api/payout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                matchId: gameState.matchId,
                gameType: 'chess',
                player1Id: gameState.player1,
                player2Id: gameState.player2,
                winnerId: winResult.winner,
                betAmount: gameState.stake,
                currency: gameState.walletMode,
                isDraw: winResult.winner == null
              })
            });
            const payoutData = await payoutRes.json();
            console.log('Chess payout result', { matchId: gameState.matchId, winnerId: winResult.winner, payoutData });
          } catch (err) {
            console.error('Chess payout error', { matchId: gameState.matchId, winnerId: winResult.winner, error: err.message });
          }
        })();
      }
      activeGames.set(matchId, gameState);
      
      io.to(matchId).emit('moveMade', {
        gameState,
        moveResult,
        winResult
      });
    } else {
      socket.emit('error', { message: moveResult.error });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[CHESS] Client disconnected: ${socket.id}`);
  });
});

// Chess game logic functions
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

function validateChessMove(gameState, move, playerId) {
  const { from, to } = move;
  const [fromFile, fromRank] = from;
  const [toFile, toRank] = to;
  
  const piece = gameState.board[fromRank][fromFile];
  if (!piece) {
    return { valid: false, error: 'No piece at source position' };
  }

  // Determine piece color based on player
  const pieceColor = gameState.player1 === playerId ? 'white' : 'black';
  if (piece.color !== pieceColor) {
    return { valid: false, error: 'Not your piece' };
  }

  // Simplified move validation (implement full chess rules as needed)
  const validMoves = getValidChessMoves(piece, fromFile, fromRank, gameState.board);
  const isValidMove = validMoves.some(m => m.file === toFile && m.rank === toRank);
  
  if (!isValidMove) {
    return { valid: false, error: 'Invalid move' };
  }

  // Make the move
  const newBoard = gameState.board.map(row => [...row]);
  const capturedPiece = newBoard[toRank][toFile];
  newBoard[toRank][toFile] = { ...piece, hasMoved: true };
  newBoard[fromRank][fromFile] = null;

  return {
    valid: true,
    newBoard,
    moveData: { from, to, piece, captured: capturedPiece },
    capturedPiece
  };
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
      
    // Add other piece move logic here...
  }
  
  return moves;
}

function checkChessWinCondition(gameState) {
  // Simplified win condition - check for king capture
  let whiteKing = false;
  let blackKing = false;
  let pieceCount = 0;
  let onlyKings = true;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = gameState.board[rank][file];
      if (piece) {
        pieceCount++;
        if (piece.type !== 'king') onlyKings = false;
        if (piece.type === 'king') {
          if (piece.color === 'white') whiteKing = true;
          if (piece.color === 'black') blackKing = true;
        }
      }
    }
  }

  if (!whiteKing) {
    return { gameOver: true, winner: gameState.player2, reason: 'checkmate' };
  }
  if (!blackKing) {
    return { gameOver: true, winner: gameState.player1, reason: 'checkmate' };
  }
  // Draw: only kings left or 100 moves (simplified)
  if (onlyKings || (gameState.moveHistory && gameState.moveHistory.length >= 100)) {
    return { gameOver: true, winner: null, reason: 'draw' };
  }
  return { gameOver: false };
}

// Cleanup old games periodically
setInterval(() => {
  const now = new Date();
  for (const [matchId, gameState] of activeGames.entries()) {
    const gameAge = now - new Date(gameState.createdAt);
    if (gameAge > 24 * 60 * 60 * 1000) { // 24 hours
      activeGames.delete(matchId);
      gameStates.delete(matchId);
      console.log(`[CHESS] Cleaned up old game: ${matchId}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Admin endpoints
app.use('/admin', (req, res, next) => {
  // Verify admin token (simplified - in production use proper JWT verification)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Get chess game statistics
app.get('/admin/stats', (req, res) => {
  const stats = {
    totalGames: activeGames.size,
    activeGames: Array.from(activeGames.values()).filter(game => game.status === 'playing').length,
    waitingGames: Array.from(activeGames.values()).filter(game => game.status === 'waiting').length,
    totalPlayers: new Set(Array.from(activeGames.values()).flatMap(game => [game.player1, game.player2])).size,
    averageGameDuration: calculateAverageGameDuration(),
    popularOpenings: getPopularOpenings(),
    winRates: getWinRates()
  };
  
  res.json({ success: true, data: stats });
});

// Get live chess games
app.get('/admin/live', (req, res) => {
  const liveGames = Array.from(activeGames.values())
    .filter(game => game.status === 'playing')
    .map(game => ({
      id: game.matchId,
      gameId: 'chess',
      gameName: 'Chess',
      player1: game.player1,
      player2: game.player2,
      status: game.status,
      bet: game.bet || 0,
      startTime: game.startTime,
      duration: Date.now() - game.startTime,
      spectators: game.spectators || 0,
      currentTurn: game.currentTurn,
      moveCount: game.moves ? game.moves.length : 0
    }));
  
  res.json({ success: true, data: { games: liveGames } });
});

// Get finished chess games
app.get('/admin/finished', (req, res) => {
  const finishedGames = Array.from(activeGames.values())
    .filter(game => game.status === 'finished')
    .map(game => ({
      id: game.matchId,
      gameId: 'chess',
      gameName: 'Chess',
      player1: game.player1,
      player2: game.player2,
      winner: game.winner,
      bet: game.bet || 0,
      startTime: game.startTime,
      endTime: game.endTime,
      duration: game.endTime - game.startTime,
      replayAvailable: true,
      moveCount: game.moves ? game.moves.length : 0,
      result: game.result
    }));
  
  res.json({ success: true, data: { games: finishedGames } });
});

// Get chess game logs
app.get('/admin/logs', (req, res) => {
  const logs = Array.from(activeGames.values())
    .map(game => ({
      id: game.matchId,
      gameId: 'chess',
      gameName: 'Chess',
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
      flags: []
    }));
  
  res.json({ success: true, data: { logs } });
});

// Force end a chess game
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

// Get chess game configuration
app.get('/admin/config', (req, res) => {
  const config = {
    gameId: 'chess',
    name: 'Chess',
    description: 'Classic chess game with real-time multiplayer',
    minBet: 10,
    maxBet: 1000,
    players: 2,
    isActive: true,
    rules: [
      { name: 'Standard Chess Rules', description: 'Follows FIDE rules' },
      { name: 'Time Control', description: 'No time limit' },
      { name: 'Move Validation', description: 'All moves are validated' }
    ]
  };
  
  res.json({ success: true, data: config });
});

// Update chess game configuration
app.put('/admin/config', (req, res) => {
  const { minBet, maxBet, isActive } = req.body;
  
  // Update configuration (in production, store in database)
  console.log('Chess configuration updated:', { minBet, maxBet, isActive });
  
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

function getPopularOpenings() {
  // Analyze first few moves to determine openings
  const openings = {};
  
  Array.from(activeGames.values()).forEach(game => {
    if (game.moves && game.moves.length >= 2) {
      const opening = `${game.moves[0].piece}${game.moves[0].to} ${game.moves[1].piece}${game.moves[1].to}`;
      openings[opening] = (openings[opening] || 0) + 1;
    }
  });
  
  return Object.entries(openings)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([opening, count]) => ({ opening, count }));
}

function getWinRates() {
  const stats = { white: { wins: 0, total: 0 }, black: { wins: 0, total: 0 } };
  
  Array.from(activeGames.values()).forEach(game => {
    if (game.status === 'finished' && game.winner) {
      if (game.winner === game.player1) {
        stats.white.wins++;
      } else {
        stats.black.wins++;
      }
      stats.white.total++;
      stats.black.total++;
    }
  });
  
  return {
    white: stats.white.total > 0 ? (stats.white.wins / stats.white.total * 100).toFixed(1) : 0,
    black: stats.black.total > 0 ? (stats.black.wins / stats.black.total * 100).toFixed(1) : 0
  };
}

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`[CHESS] Chess service running on port ${PORT}`);
  console.log(`[CHESS] Health check: http://localhost:${PORT}/health`);
}); 
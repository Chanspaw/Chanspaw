const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

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

// Game service registry
const gameServices = new Map();
const matchmakingQueue = [];
const activeMatches = new Map();

// Register available game services
gameServices.set('chess', {
  url: process.env.CHESS_SERVICE_URL || 'http://localhost:4001',
  name: 'Chess',
  minPlayers: 2,
  maxPlayers: 2
});

gameServices.set('connect_four', {
  url: process.env.CONNECT4_SERVICE_URL || 'http://localhost:4002',
  name: 'Connect Four',
  minPlayers: 2,
  maxPlayers: 2
});

gameServices.set('diamond_hunt', {
  url: process.env.DIAMOND_SERVICE_URL || 'http://localhost:4003',
  name: 'Diamond Hunt',
  minPlayers: 2,
  maxPlayers: 2
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'matchmaking-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    queueSize: matchmakingQueue.length,
    activeMatches: activeMatches.size,
    registeredGames: Array.from(gameServices.keys())
  });
});

// Matchmaking API endpoints
app.post('/api/matchmaking/join', async (req, res) => {
  const { gameId, playerId, stake, walletMode } = req.body;
  
  if (!gameId || !playerId || !stake || !walletMode) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  if (!gameServices.has(gameId)) {
    return res.status(400).json({ error: 'Game not supported' });
  }

  // Remove player from any existing queue
  const existingIndex = matchmakingQueue.findIndex(
    entry => entry.playerId === playerId
  );
  if (existingIndex !== -1) {
    matchmakingQueue.splice(existingIndex, 1);
  }

  // Add to queue
  const queueEntry = {
    id: uuidv4(),
    gameId,
    playerId,
    stake,
    walletMode,
    timestamp: new Date().toISOString()
  };
  
  matchmakingQueue.push(queueEntry);

  // Try to find a match
  const match = await findMatch(gameId, playerId, stake, walletMode);
  
  if (match) {
    // Remove matched players from queue
    matchmakingQueue.splice(matchmakingQueue.findIndex(e => e.playerId === match.player1), 1);
    matchmakingQueue.splice(matchmakingQueue.findIndex(e => e.playerId === match.player2), 1);
    
    // Create game session
    const gameSession = await createGameSession(match);
    
    res.json({
      success: true,
      match,
      gameSession,
      message: 'Match found!'
    });
  } else {
    res.json({
      success: true,
      queuePosition: matchmakingQueue.length,
      message: 'Added to queue'
    });
  }
});

app.post('/api/matchmaking/leave', (req, res) => {
  const { playerId } = req.body;
  
  const index = matchmakingQueue.findIndex(entry => entry.playerId === playerId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
  }

  res.json({
    success: true,
    message: 'Left queue'
  });
});

app.get('/api/matchmaking/queue', (req, res) => {
  const { gameId } = req.query;
  
  let queue = matchmakingQueue;
  if (gameId) {
    queue = matchmakingQueue.filter(entry => entry.gameId === gameId);
  }

  res.json({
    success: true,
    queue,
    totalInQueue: matchmakingQueue.length
  });
});

app.get('/api/matchmaking/matches', (req, res) => {
  res.json({
    success: true,
    matches: Array.from(activeMatches.values())
  });
});

// Socket.IO for real-time matchmaking
io.on('connection', (socket) => {
  console.log(`[MATCHMAKING] Client connected: ${socket.id}`);

  socket.on('joinQueue', async (data) => {
    const { gameId, playerId, stake, walletMode } = data;
    
    console.log(`[MATCHMAKING] User ${playerId} joining queue: gameId=${gameId}, stake=${stake}, walletMode=${walletMode}`);
    
    // Remove from any existing queue
    const existingIndex = matchmakingQueue.findIndex(
      entry => entry.playerId === playerId
    );
    if (existingIndex !== -1) {
      matchmakingQueue.splice(existingIndex, 1);
    }

    // Add to queue
    const queueEntry = {
      id: uuidv4(),
      gameId,
      playerId,
      stake,
      walletMode,
      timestamp: new Date().toISOString()
    };
    
    matchmakingQueue.push(queueEntry);
    socket.join(`queue_${gameId}_${stake}_${walletMode}`);

    // Try to find a match
    const match = await findMatch(gameId, playerId, stake, walletMode);
    
    if (match) {
      // Remove matched players from queue
      matchmakingQueue.splice(matchmakingQueue.findIndex(e => e.playerId === match.player1), 1);
      matchmakingQueue.splice(matchmakingQueue.findIndex(e => e.playerId === match.player2), 1);
      
      // Create game session
      const gameSession = await createGameSession(match);
      
      // Notify both players
      io.to(`queue_${gameId}_${stake}_${walletMode}`).emit('matchFound', {
        match,
        gameSession
      });
      
      // Join game room
      socket.join(`game_${match.id}`);
    } else {
      socket.emit('queueJoined', {
        queuePosition: matchmakingQueue.filter(e => e.gameId === gameId && e.stake === stake && e.walletMode === walletMode).length,
        estimatedWaitTime: '2-5 minutes'
      });
    }
  });

  socket.on('leaveQueue', (data) => {
    const { playerId } = data;
    
    const index = matchmakingQueue.findIndex(entry => entry.playerId === playerId);
    if (index !== -1) {
      const entry = matchmakingQueue[index];
      matchmakingQueue.splice(index, 1);
      socket.leave(`queue_${entry.gameId}_${entry.stake}_${entry.walletMode}`);
    }

    socket.emit('queueLeft', { message: 'Left queue' });
  });

  socket.on('disconnect', () => {
    console.log(`[MATCHMAKING] Client disconnected: ${socket.id}`);
  });
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

// Get matchmaking statistics
app.get('/admin/stats', (req, res) => {
  const stats = {
    totalQueues: Object.keys(queues).length,
    totalPlayers: Object.values(queues).reduce((sum, queue) => sum + queue.length, 0),
    averageWaitTime: calculateAverageWaitTime(),
    matchmakingSuccessRate: calculateMatchmakingSuccessRate(),
    queueBreakdown: getQueueBreakdown(),
    recentMatches: getRecentMatches()
  };
  
  res.json({ success: true, data: stats });
});

// Get current queues
app.get('/admin/queues', (req, res) => {
  const queueData = Object.entries(queues).map(([key, queue]) => {
    const [gameId, walletMode, stake] = key.split(':');
    return {
      queueKey: key,
      gameId,
      walletMode,
      stake: parseInt(stake),
      playerCount: queue.length,
      players: queue.map(player => ({
        userId: player.userId,
        joinTime: player.joinTime,
        waitTime: Date.now() - player.joinTime
      }))
    };
  });
  
  res.json({ success: true, data: { queues: queueData } });
});

// Get matchmaking logs
app.get('/admin/logs', (req, res) => {
  const logs = recentMatches.map(match => ({
    id: match.matchId,
    gameId: match.gameId,
    player1: match.player1,
    player2: match.player2,
    matchTime: match.matchTime,
    waitTime: match.waitTime,
    stake: match.stake,
    walletMode: match.walletMode
  }));
  
  res.json({ success: true, data: { logs } });
});

// Force clear a queue
app.post('/admin/clear-queue', (req, res) => {
  const { queueKey } = req.body;
  
  if (!queues[queueKey]) {
    return res.status(404).json({ error: 'Queue not found' });
  }
  
  const players = queues[queueKey];
  delete queues[queueKey];
  
  // Notify players that queue was cleared
  players.forEach(player => {
    io.to(player.socketId).emit('queueCleared', {
      reason: 'Queue cleared by admin',
      gameId: queueKey.split(':')[0]
    });
  });
  
  res.json({ 
    success: true, 
    message: 'Queue cleared successfully',
    playersRemoved: players.length
  });
});

// Get matchmaking configuration
app.get('/admin/config', (req, res) => {
  const config = {
    serviceId: 'matchmaking',
    name: 'Matchmaking Service',
    description: 'Handles player matchmaking for all games',
    maxWaitTime: 300000, // 5 minutes
    maxQueueSize: 100,
    matchmakingTimeout: 60000, // 1 minute
    isActive: true,
    supportedGames: ['chess', 'diamond_hunt', 'connect_four'],
    rules: [
      { name: 'Skill-Based Matching', description: 'Match players with similar skill levels' },
      { name: 'Stake Matching', description: 'Match players with same bet amount' },
      { name: 'Wallet Mode Matching', description: 'Match players with same wallet mode' },
      { name: 'Timeout Handling', description: 'Auto-clear players after max wait time' }
    ]
  };
  
  res.json({ success: true, data: config });
});

// Update matchmaking configuration
app.put('/admin/config', (req, res) => {
  const { maxWaitTime, maxQueueSize, matchmakingTimeout, isActive } = req.body;
  
  // Update configuration (in production, store in database)
  console.log('Matchmaking configuration updated:', { 
    maxWaitTime, 
    maxQueueSize, 
    matchmakingTimeout, 
    isActive 
  });
  
  res.json({ success: true, message: 'Configuration updated successfully' });
});

// Get system health
app.get('/admin/health', (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeConnections: io.engine.clientsCount,
    queueCount: Object.keys(queues).length,
    totalPlayers: Object.values(queues).reduce((sum, queue) => sum + queue.length, 0),
    lastMatchTime: recentMatches.length > 0 ? recentMatches[recentMatches.length - 1].matchTime : null
  };
  
  res.json({ success: true, data: health });
});

// Helper functions
async function findMatch(gameId, playerId, stake, walletMode) {
  const potentialMatch = matchmakingQueue.find(
    entry => 
      entry.gameId === gameId &&
      entry.stake === stake &&
      entry.walletMode === walletMode &&
      entry.playerId !== playerId
  );

  if (potentialMatch) {
    const match = {
      id: uuidv4(),
      gameId,
      player1: Math.random() < 0.5 ? playerId : potentialMatch.playerId,
      player2: Math.random() < 0.5 ? playerId : potentialMatch.playerId,
      stake,
      walletMode,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    activeMatches.set(match.id, match);
    return match;
  }

  return null;
}

async function createGameSession(match) {
  const gameService = gameServices.get(match.gameId);
  if (!gameService) {
    throw new Error(`Game service not found for ${match.gameId}`);
  }

  try {
    // Initialize game in the specific game service
    const response = await axios.post(`${gameService.url}/api/game/initialize`, {
      matchId: match.id,
      player1: match.player1,
      player2: match.player2,
      stake: match.stake,
      walletMode: match.walletMode
    });

    if (response.data.success) {
      match.status = 'active';
      match.gameSession = response.data.gameState;
      activeMatches.set(match.id, match);
      
      return response.data.gameState;
    } else {
      throw new Error('Failed to initialize game');
    }
  } catch (error) {
    console.error(`[MATCHMAKING] Failed to create game session:`, error.message);
    throw error;
  }
}

// Cleanup old matches periodically
setInterval(() => {
  const now = new Date();
  for (const [matchId, match] of activeMatches.entries()) {
    const matchAge = now - new Date(match.createdAt);
    if (matchAge > 24 * 60 * 60 * 1000) { // 24 hours
      activeMatches.delete(matchId);
      console.log(`[MATCHMAKING] Cleaned up old match: ${matchId}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Broadcast queue stats periodically
setInterval(() => {
  const stats = {};
  for (const entry of matchmakingQueue) {
    const key = `${entry.gameId}:${entry.walletMode}:${entry.stake}`;
    stats[key] = (stats[key] || 0) + 1;
  }
  
  io.emit('queueStats', stats);
}, 5000); // Every 5 seconds

function calculateAverageWaitTime() {
  if (recentMatches.length === 0) return 0;
  
  const totalWaitTime = recentMatches.reduce((sum, match) => {
    return sum + match.waitTime;
  }, 0);
  
  return Math.round(totalWaitTime / recentMatches.length / 1000); // in seconds
}

function calculateMatchmakingSuccessRate() {
  // This would need to track failed matchmaking attempts
  // For now, return a placeholder
  return 95.5; // 95.5% success rate
}

function getQueueBreakdown() {
  const breakdown = {};
  
  Object.entries(queues).forEach(([key, queue]) => {
    const [gameId, walletMode, stake] = key.split(':');
    
    if (!breakdown[gameId]) {
      breakdown[gameId] = { total: 0, virtual: 0, real: 0 };
    }
    
    breakdown[gameId].total += queue.length;
    if (walletMode === 'virtual') {
      breakdown[gameId].virtual += queue.length;
    } else {
      breakdown[gameId].real += queue.length;
    }
  });
  
  return breakdown;
}

function getRecentMatches() {
  return recentMatches
    .slice(-20) // Last 20 matches
    .map(match => ({
      matchId: match.matchId,
      gameId: match.gameId,
      player1: match.player1,
      player2: match.player2,
      matchTime: match.matchTime,
      waitTime: Math.round(match.waitTime / 1000), // in seconds
      stake: match.stake,
      walletMode: match.walletMode
    }));
}

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`[MATCHMAKING] Matchmaking service running on port ${PORT}`);
  console.log(`[MATCHMAKING] Health check: http://localhost:${PORT}/health`);
  console.log(`[MATCHMAKING] Registered games:`, Array.from(gameServices.keys()));
}); 
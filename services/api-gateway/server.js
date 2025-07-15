const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
const axios = require('axios');
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
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
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Service registry
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  wallet: process.env.WALLET_SERVICE_URL || 'http://localhost:3002',
  matchmaking: process.env.MATCHMAKING_SERVICE_URL || 'http://localhost:3003',
  chess: process.env.CHESS_SERVICE_URL || 'http://localhost:4001',
  connect4: process.env.CONNECT4_SERVICE_URL || 'http://localhost:4002',
  diamond: process.env.DIAMOND_SERVICE_URL || 'http://localhost:4003'
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  // Check health of all services
  for (const [serviceName, serviceUrl] of Object.entries(services)) {
    try {
      const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
      health.services[serviceName] = {
        status: 'healthy',
        url: serviceUrl,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      health.services[serviceName] = {
        status: 'unhealthy',
        url: serviceUrl,
        error: error.message
      };
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    services: Object.keys(services),
    endpoints: {
      auth: '/api/auth/*',
      wallet: '/api/wallet/*',
      matchmaking: '/api/matchmaking/*',
      chess: '/api/chess/*',
      connect4: '/api/connect4/*',
      diamond: '/api/diamond/*'
    }
  });
});

// Proxy middleware configuration
const createProxy = (target, serviceName) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${serviceName}`]: '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.info('Proxying request', {
        method: req.method,
        path: req.path,
        service: serviceName,
        target: target
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.info('Proxied response', {
        method: req.method,
        path: req.path,
        service: serviceName,
        statusCode: proxyRes.statusCode
      });
    },
    onError: (err, req, res) => {
      logger.error('Proxy error', {
        error: err.message,
        service: serviceName,
        path: req.path
      });
      res.status(503).json({
        success: false,
        error: `Service ${serviceName} is unavailable`,
        service: serviceName
      });
    }
  });
};

// Route requests to appropriate services
app.use('/api/auth', createProxy(services.auth, 'auth'));
app.use('/api/wallet', createProxy(services.wallet, 'wallet'));
app.use('/api/matchmaking', createProxy(services.matchmaking, 'matchmaking'));
app.use('/api/chess', createProxy(services.chess, 'chess'));
app.use('/api/connect4', createProxy(services.connect4, 'connect4'));
app.use('/api/diamond', createProxy(services.diamond, 'diamond'));

// Cross-service endpoints
app.get('/api/games/status', async (req, res) => {
  try {
    const gameServices = ['chess', 'connect4', 'diamond'];
    const status = {};

    for (const service of gameServices) {
      try {
        const response = await axios.get(`${services[service]}/health`, { timeout: 3000 });
        status[service] = {
          status: 'healthy',
          activeGames: response.data.activeGames || 0,
          uptime: response.data.uptime
        };
      } catch (error) {
        status[service] = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: status
    });
  } catch (error) {
    logger.error('Error fetching game status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game status'
    });
  }
});

// Matchmaking with game service integration
app.post('/api/matchmaking/join-game', async (req, res) => {
  try {
    const { gameId, playerId, stake, walletMode } = req.body;

    // First, join the matchmaking queue
    const matchmakingResponse = await axios.post(`${services.matchmaking}/api/matchmaking/join`, {
      gameId,
      playerId,
      stake,
      walletMode
    });

    if (matchmakingResponse.data.success && matchmakingResponse.data.match) {
      // If match found, initialize the game in the appropriate service
      const match = matchmakingResponse.data.match;
      const gameServiceUrl = services[gameId];

      if (gameServiceUrl) {
        try {
          const gameResponse = await axios.post(`${gameServiceUrl}/api/game/initialize`, {
            matchId: match.id,
            player1: match.player1,
            player2: match.player2,
            stake: match.stake,
            walletMode: match.walletMode
          });

          res.json({
            success: true,
            match,
            gameState: gameResponse.data.gameState,
            message: 'Match found and game initialized!'
          });
        } catch (gameError) {
          logger.error('Error initializing game', { error: gameError.message, gameId, matchId: match.id });
          res.status(500).json({
            success: false,
            error: 'Failed to initialize game',
            match
          });
        }
      } else {
        res.json(matchmakingResponse.data);
      }
    } else {
      res.json(matchmakingResponse.data);
    }
  } catch (error) {
    logger.error('Error in join-game', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to join game'
    });
  }
});

// Admin routes for game management
app.use('/admin/games', async (req, res) => {
  try {
    const { gameId } = req.query;
    let targetService;
    
    switch (gameId) {
      case 'chess':
        targetService = 'http://localhost:3002';
        break;
      case 'diamond_hunt':
        targetService = 'http://localhost:3003';
        break;
      case 'connect_four':
        targetService = 'http://localhost:3004';
        break;
      default:
        return res.status(400).json({ error: 'Invalid game ID' });
    }
    
    const response = await fetch(`${targetService}/admin${req.url.replace('/admin/games', '')}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Admin gateway error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes for matchmaking service
app.use('/admin/matchmaking', async (req, res) => {
  try {
    const targetService = 'http://localhost:3005';
    
    const response = await fetch(`${targetService}/admin${req.url.replace('/admin/matchmaking', '')}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Admin gateway error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/api/auth/*',
      '/api/wallet/*',
      '/api/matchmaking/*',
      '/api/chess/*',
      '/api/connect4/*',
      '/api/diamond/*',
      '/api/games/status',
      '/health'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info('API Gateway started', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/health`,
    services: Object.keys(services)
  });
}); 
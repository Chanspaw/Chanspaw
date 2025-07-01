const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        real_balance: true,
        virtual_balance: true,
        isAdmin: true,
        isVerified: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Middleware pour vérifier les permissions admin
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est vérifié
const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required'
    });
  }
  next();
};

// Middleware pour vérifier la propriété de la ressource
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.userId;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID required'
        });
      }

      let resource;
      
      switch (resourceType) {
        case 'user':
          resource = await prisma.user.findUnique({
            where: { id: resourceId },
            select: { id: true, username: true }
          });
          break;
        case 'friend':
          resource = await prisma.friend.findFirst({
            where: {
              OR: [
                { userId: req.user.id, friendId: resourceId },
                { userId: resourceId, friendId: req.user.id }
              ]
            }
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid resource type'
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Permettre l'accès si l'utilisateur est admin ou propriétaire
      if (req.user.isAdmin || resource.userId === req.user.id || resource.friendId === req.user.id) {
        req.resource = resource;
        next();
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization error'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireVerified,
  requireOwnership
}; 
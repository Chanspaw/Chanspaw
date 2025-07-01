// Middleware de gestion d'erreurs global
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erreurs Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      details: 'This record already exists'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found'
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Foreign key constraint failed'
    });
  }

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Erreurs de syntaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
  }

  // Erreurs de limite de taille
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large'
    });
  }

  // Erreurs de rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: err.retryAfter
    });
  }

  // Erreurs par défaut
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  // En production, ne pas exposer les détails d'erreur
  const errorResponse = {
    success: false,
    error: message
  };

  // En développement, ajouter plus de détails
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware pour capturer les erreurs asynchrones
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware pour valider les paramètres
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Middleware pour logger les erreurs
const errorLogger = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code
    }
  };

  console.error('Error Log:', JSON.stringify(errorLog, null, 2));
  next(err);
};

module.exports = {
  errorHandler,
  asyncHandler,
  validateParams,
  errorLogger
}; 
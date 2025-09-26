const jwt = require('jsonwebtoken');
const appConfig = require('../config/app.config');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token is required',
      code: 'NO_TOKEN'
    });
  }

  jwt.verify(token, appConfig.jwt.secret, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      
      return res.status(403).json({ 
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }

    // Add user info to request object
    req.user = user;
    next();
  });
};

/**
 * Middleware to authenticate token but continue if no token (optional auth)
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, appConfig.jwt.secret, (err, user) => {
    if (err) {
      console.warn('Optional auth - token verification failed:', err.message);
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

/**
 * Middleware to check if user has specific role/permission
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is accessing their own data
 */
const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const requestedUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (requestedUserId && parseInt(requestedUserId) !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Access denied - can only access your own data',
        code: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Middleware to refresh token if it's close to expiring
 */
const refreshTokenIfNeeded = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenExp = req.user.exp;
  
  // If token expires in less than 15 minutes, generate a new one
  if (tokenExp && (tokenExp - now) < 900) {
    try {
      const newToken = jwt.sign(
        { 
          userId: req.user.userId, 
          email: req.user.email, 
          username: req.user.username 
        },
        appConfig.jwt.secret,
        { expiresIn: appConfig.jwt.expiresIn }
      );
      
      // Add new token to response headers
      res.set('X-Refreshed-Token', newToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      // Continue anyway - not critical
    }
  }

  next();
};

/**
 * Rate limiting middleware for sensitive auth operations
 */
const createAuthRateLimit = () => {
  const attempts = new Map();
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userAttempts = attempts.get(key);
    
    if (now > userAttempts.resetTime) {
      // Reset window
      userAttempts.count = 1;
      userAttempts.resetTime = now + windowMs;
      return next();
    }
    
    if (userAttempts.count >= maxAttempts) {
      const remainingTime = Math.ceil((userAttempts.resetTime - now) / 60000);
      return res.status(429).json({
        error: `Too many authentication attempts. Please try again in ${remainingTime} minutes.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: remainingTime
      });
    }
    
    userAttempts.count++;
    next();
  };
};

/**
 * Middleware to log authentication events
 */
const logAuthEvent = (event) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const userId = req.user ? req.user.userId : 'anonymous';
    
    console.log(`[AUTH EVENT] ${event} - User: ${userId}, IP: ${ip}, UA: ${userAgent}`);
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuthenticate,
  requireRole,
  requireOwnership,
  refreshTokenIfNeeded,
  createAuthRateLimit,
  logAuthEvent
};
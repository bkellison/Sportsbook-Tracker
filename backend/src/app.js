require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configuration
const appConfig = require('./config/app.config');
const databaseConfig = require('./config/database.config');

// Import utilities
const DatabaseUtils = require('./utils/database');
const Helpers = require('./utils/helpers');

// Import middleware
const { errorHandler, notFound, requestLogger } = require('./middleware/error.middleware');
const { authenticateToken } = require('./middleware/auth.middleware');

// Import routes
const routes = require('./routes');
const authRoutes = require('./routes/auth.routes');

class App {
  constructor() {
    this.app = express();
    this.port = appConfig.port;
    
    this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    try {
      Helpers.log('Initializing database connection...', 'info');
      
      // Create database connection pool
      const pool = DatabaseUtils.createPool(databaseConfig.config);
      
      // Test the connection
      const isConnected = await DatabaseUtils.testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }
      
      Helpers.log('Database connection established successfully', 'success');
      
      // Optional: Run database optimizations on startup
      if (appConfig.environment === 'production') {
        try {
          await DatabaseUtils.optimizeTables();
          Helpers.log('Database tables optimized', 'info');
        } catch (error) {
          Helpers.log(`Database optimization failed: ${error.message}`, 'warn');
        }
      }
      
    } catch (error) {
      Helpers.log(`Database initialization failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Initialize middleware
   */
  initializeMiddleware() {
    Helpers.log('Initializing middleware...', 'info');

    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: appConfig.environment === 'production'
    }));

    // CORS configuration
    const corsOptions = {
      origin: this.getAllowedOrigins(),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400 // 24 hours
    };
    this.app.use(cors(corsOptions));

    // Compression middleware
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024
    }));

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Request logging (development only)
    if (appConfig.environment === 'development') {
      this.app.use(requestLogger);
    }

    // Rate limiting
    this.initializeRateLimiting();

    // Health check endpoint (before other routes)
    this.app.get('/health', this.healthCheckHandler.bind(this));

    // API documentation endpoint
    this.app.get('/api-docs', this.apiDocsHandler.bind(this));

    Helpers.log('Middleware initialized successfully', 'success');
  }

  /**
   * Initialize rate limiting
   */
  initializeRateLimiting() {
    // General rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks and api docs
        return req.path === '/health' || req.path === '/api-docs';
      }
    });

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Limit each IP to 20 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    // Apply rate limiters
    this.app.use('/api', generalLimiter);
    this.app.use('/api/auth', authLimiter);
    this.app.use('/auth', authLimiter); // Also apply to direct auth routes
  }

  /**
   * Initialize routes
   */
  initializeRoutes() {
    Helpers.log('Initializing routes...', 'info');

    // COMPATIBILITY: Direct auth routes (for frontend calling /auth/login)
    // This allows both /auth/login AND /api/auth/login to work
    this.app.use('/auth', authRoutes);

    // Main API routes (with /api prefix)
    this.app.use('/api', routes);

    // Serve static files if needed (for production)
    if (appConfig.environment === 'production') {
      this.app.use(express.static('public'));
      
      // Handle client-side routing (SPA)
      this.app.get('*', (req, res) => {
        // Check if request is for API endpoints
        if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
          return res.status(404).json({
            error: 'API endpoint not found',
            code: 'ENDPOINT_NOT_FOUND',
            requestedPath: req.path,
            availableEndpoints: {
              auth: ['/auth/login', '/auth/register', '/api/auth/login', '/api/auth/register'],
              api: '/api-docs'
            }
          });
        }
        
        // Serve React app for all other routes
        try {
          res.sendFile(path.join(__dirname, '../public/index.html'));
        } catch (error) {
          res.status(404).json({
            error: 'Static files not found',
            message: 'Run npm run build to generate static files'
          });
        }
      });
    }

    Helpers.log('Routes initialized successfully', 'success');
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    Helpers.log('Initializing error handling...', 'info');

    // 404 handler for unknown routes
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      Helpers.log(`Uncaught Exception: ${error.message}`, 'error');
      console.error(error.stack);
      
      // Graceful shutdown
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      Helpers.log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
      
      // Graceful shutdown
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Graceful shutdown signals
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    Helpers.log('Error handling initialized successfully', 'success');
  }

  /**
   * Get allowed CORS origins
   */
  getAllowedOrigins() {
    const origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];

    // Add production origins
    if (appConfig.environment === 'production') {
      if (appConfig.frontendUrl) {
        origins.push(appConfig.frontendUrl);
      }
    }

    return origins;
  }

  /**
   * Health check handler
   */
  async healthCheckHandler(req, res) {
    try {
      const startTime = Date.now();
      
      // Check database health
      const dbHealth = await DatabaseUtils.healthCheck();
      
      // Get system info
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Get database stats (only if database is healthy)
      let dbStats = null;
      if (dbHealth.status === 'healthy') {
        try {
          dbStats = await DatabaseUtils.getDatabaseStats();
        } catch (error) {
          console.warn('Could not get database stats:', error.message);
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: appConfig.environment,
        version: appConfig.version,
        uptime: {
          seconds: Math.floor(uptime),
          human: this.formatUptime(uptime)
        },
        memory: {
          used: Helpers.formatFileSize(memUsage.heapUsed),
          total: Helpers.formatFileSize(memUsage.heapTotal),
          external: Helpers.formatFileSize(memUsage.external),
          rss: Helpers.formatFileSize(memUsage.rss)
        },
        database: {
          status: dbHealth.status,
          responseTime: `${dbHealth.responseTime}ms`,
          stats: dbStats
        },
        api: {
          responseTime: `${responseTime}ms`
        },
        routes: {
          auth: {
            direct: '/auth/login',
            api: '/api/auth/login'
          }
        }
      };

      // Determine overall health status
      if (dbHealth.status !== 'healthy') {
        healthData.status = 'degraded';
        res.status(503);
      }

      res.json(healthData);
      
    } catch (error) {
      Helpers.log(`Health check failed: ${error.message}`, 'error');
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        routes: {
          auth: {
            direct: '/auth/login',
            api: '/api/auth/login'
          }
        }
      });
    }
  }

  /**
   * API documentation handler
   */
  apiDocsHandler(req, res) {
    const docs = {
      name: 'Sportsbook Tracker API',
      version: appConfig.version,
      description: 'REST API for managing sportsbook accounts, transactions, and betting data',
      baseUrl: `${req.protocol}://${req.get('host')}/api`,
      compatibilityRoutes: {
        note: 'Auth endpoints available at both /auth and /api/auth for compatibility',
        auth: `${req.protocol}://${req.get('host')}/auth`
      },
      endpoints: {
        health: 'GET /health - System health check',
        auth: {
          base: '/api/auth (also available at /auth)',
          endpoints: [
            'POST /register - Register new user',
            'POST /login - Login user',
            'GET /validate - Validate JWT token',
            'POST /change-password - Change user password',
            'POST /logout - Logout user',
            'GET /profile - Get user profile',
            'POST /refresh - Refresh JWT token'
          ]
        },
        accounts: {
          base: '/api/accounts',
          endpoints: [
            'GET / - Get all user accounts',
            'GET /summary - Get accounts summary',
            'GET /activity - Get recent activity',
            'GET /:accountKey - Get specific account',
            'GET /:accountKey/stats - Get account statistics',
            'PUT /:accountKey - Update account',
            'DELETE /:accountKey - Clear account data',
            'POST /:accountKey/recalculate - Recalculate balances'
          ]
        },
        transactions: {
          base: '/api/transactions',
          endpoints: [
            'GET / - Get all transactions',
            'GET /summary - Get transaction summary',
            'GET /recent - Get recent transactions',
            'GET /stats - Get transaction statistics',
            'GET /:id - Get specific transaction',
            'POST / - Create transaction',
            'PUT /:id - Update transaction',
            'DELETE /:id - Delete transaction',
            'POST /bulk - Create multiple transactions'
          ]
        },
        bets: {
          base: '/api/bets',
          endpoints: [
            'GET / - Get all bets',
            'GET /pending - Get pending bets',
            'GET /recent - Get recent bets',
            'GET /stats - Get betting statistics',
            'GET /streak - Get betting streak info',
            'GET /:id - Get specific bet',
            'POST / - Create bet',
            'PUT /:id - Update bet status',
            'DELETE /:id - Delete bet',
            'POST /:id/settle - Settle bet'
          ]
        },
        bulk: {
          base: '/api',
          endpoints: [
            'POST /bulk-import - Import bulk data',
            'DELETE /reset - Reset all user data',
            'GET /export - Export data to CSV'
          ]
        }
      },
      authentication: {
        type: 'JWT Bearer Token',
        header: 'Authorization: Bearer <token>',
        note: 'Most endpoints require authentication'
      },
      rateLimit: {
        general: '1000 requests per 15 minutes',
        auth: '20 requests per 15 minutes (applied to both /auth and /api/auth)'
      },
      timestamp: new Date().toISOString()
    };

    res.json(docs);
  }

  /**
   * Format uptime in human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal) {
    Helpers.log(`Received ${signal}. Starting graceful shutdown...`, 'warn');

    // Set a timeout for forced shutdown
    const shutdownTimeout = setTimeout(() => {
      Helpers.log('Forced shutdown due to timeout', 'error');
      process.exit(1);
    }, 30000); // 30 seconds

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        Helpers.log('HTTP server closed', 'info');
      }

      // Close database connections
      await DatabaseUtils.close();
      Helpers.log('Database connections closed', 'info');

      // Clear shutdown timeout
      clearTimeout(shutdownTimeout);

      Helpers.log('Graceful shutdown completed', 'success');
      process.exit(0);

    } catch (error) {
      Helpers.log(`Error during shutdown: ${error.message}`, 'error');
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  /**
   * Start the server
   */
  start() {
    this.server = this.app.listen(this.port, () => {
      Helpers.log(`
╔═══════════════════════════════════════════════════════════╗
║                SPORTSBOOK TRACKER API                    ║
║═══════════════════════════════════════════════════════════║
║  Environment: ${appConfig.environment.padEnd(10)}                              ║
║  Port:        ${this.port.toString().padEnd(10)}                              ║
║  Version:     ${appConfig.version.padEnd(10)}                              ║
║  Database:    ${databaseConfig.database.padEnd(10)}                              ║
║                                                           ║
║  Health:      http://localhost:${this.port}/health               ║
║  API Docs:    http://localhost:${this.port}/api-docs             ║
║  API Base:    http://localhost:${this.port}/api                  ║
║  Auth:        http://localhost:${this.port}/auth (compat)        ║
╚═══════════════════════════════════════════════════════════╝
      `, 'success');
    });

    // Handle server errors
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        Helpers.log(`Port ${this.port} is already in use`, 'error');
      } else {
        Helpers.log(`Server error: ${error.message}`, 'error');
      }
      process.exit(1);
    });

    return this.server;
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get server instance
   */
  getServer() {
    return this.server;
  }
}

module.exports = App;
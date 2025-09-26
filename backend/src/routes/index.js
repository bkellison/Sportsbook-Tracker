const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const accountsRoutes = require('./accounts.routes');
const transactionsRoutes = require('./transactions.routes');
const betsRoutes = require('./bets.routes');

// Import controllers for additional routes
const BulkImportController = require('../controllers/bulkImport.controller');

// Import middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateBulkImport } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * API Routes
 */

// Authentication routes
router.use('/auth', authRoutes);

// Protected routes (require authentication)
router.use('/accounts', accountsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/bets', betsRoutes);

/**
 * Bulk Import Routes
 * These are separate from other controllers as they handle special bulk operations
 */

/**
 * @route   POST /api/bulk-import
 * @desc    Import bulk data (transactions, bets, etc.)
 * @access  Private
 */
router.post('/bulk-import',
  authenticateToken,
  validateBulkImport,
  asyncHandler(BulkImportController.bulkImport)
);

/**
 * @route   DELETE /api/reset
 * @desc    Reset all user data
 * @access  Private
 */
router.delete('/reset',
  authenticateToken,
  asyncHandler(BulkImportController.resetAllData)
);

/**
 * @route   GET /api/export
 * @desc    Export all user data to CSV
 * @access  Private
 */
router.get('/export',
  authenticateToken,
  asyncHandler(BulkImportController.exportData)
);

/**
 * Health Check Route
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sportsbook Tracker API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * API Information Route
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    api: {
      name: 'Sportsbook Tracker API',
      version: '1.0.0',
      description: 'Backend API for managing sportsbook accounts, transactions, and betting data',
      endpoints: {
        auth: {
          base: '/api/auth',
          routes: [
            'POST /register - Register a new user',
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
          routes: [
            'GET / - Get all user accounts',
            'GET /summary - Get accounts summary',
            'GET /activity - Get recent activity',
            'GET /:accountKey - Get specific account',
            'GET /:accountKey/stats - Get account statistics',
            'PUT /:accountKey - Update account',
            'DELETE /:accountKey - Clear account data',
            'POST /:accountKey/recalculate - Recalculate balances',
            'GET /:accountKey/transactions - Get account transactions',
            'GET /:accountKey/bets - Get account bets',
            'POST / - Create new account'
          ]
        },
        transactions: {
          base: '/api/transactions',
          routes: [
            'GET / - Get all transactions',
            'GET /summary - Get transaction summary',
            'GET /recent - Get recent transactions',
            'GET /stats - Get transaction statistics',
            'GET /monthly/:year/:month - Get monthly summary',
            'GET /:id - Get specific transaction',
            'POST / - Create transaction',
            'PUT /:id - Update transaction',
            'DELETE /:id - Delete transaction',
            'GET /account/:accountKey - Get account transactions',
            'GET /date-range/:start/:end - Get transactions by date',
            'POST /bulk - Create multiple transactions'
          ]
        },
        bets: {
          base: '/api/bets',
          routes: [
            'GET / - Get all bets',
            'GET /pending - Get pending bets',
            'GET /recent - Get recent bets',
            'GET /stats - Get betting statistics',
            'GET /streak - Get betting streak info',
            'GET /monthly/:year/:month - Get monthly summary',
            'GET /:id - Get specific bet',
            'POST / - Create bet',
            'PUT /:id - Update bet status',
            'DELETE /:id - Delete bet',
            'GET /account/:accountKey - Get account bets',
            'POST /:id/settle - Settle bet',
            'POST /bulk - Create multiple bets'
          ]
        },
        bulk: {
          base: '/api',
          routes: [
            'POST /bulk-import - Import bulk data',
            'DELETE /reset - Reset all user data',
            'GET /export - Export data to CSV'
          ]
        }
      },
      features: [
        'JWT Authentication',
        'Multi-account management',
        'Transaction tracking',
        'Bet management and statistics',
        'Bulk data operations',
        'CSV export/import',
        'Advanced analytics',
        'Balance calculations',
        'Win/loss tracking',
        'Streak analysis'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Statistics Route - Combined stats for dashboard
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const UserModel = require('../models/User.model');
    const stats = await UserModel.getStats(req.user.userId);
    
    res.json({
      success: true,
      stats,
      user: {
        id: req.user.userId,
        email: req.user.email,
        username: req.user.username
      }
    });
  })
);

/**
 * Dashboard Data Route - Get all essential data for dashboard
 */
router.get('/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    const TransactionModel = require('../models/Transaction.model');
    const BetModel = require('../models/Bet.model');
    
    // Get all accounts data (this includes transactions and bets)
    const accounts = await AccountModel.findByUserId(req.user.userId);
    
    // Get recent activity
    const recentActivity = await AccountModel.getRecentActivity(req.user.userId, 10);
    
    // Get pending bets
    const pendingBets = await BetModel.getPendingByUserId(req.user.userId);
    
    // Get user stats
    const UserModel = require('../models/User.model');
    const userStats = await UserModel.getStats(req.user.userId);
    
    res.json({
      success: true,
      dashboard: {
        accounts,
        recentActivity,
        pendingBets,
        stats: userStats,
        user: {
          id: req.user.userId,
          email: req.user.email,
          username: req.user.username
        }
      }
    });
  })
);

/**
 * Quick Actions Route - Common quick actions
 */
router.post('/quick-actions/:action',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { action } = req.params;
    
    switch (action) {
      case 'settle-all-pending':
        // This would settle all pending bets - placeholder for future implementation
        res.status(501).json({
          error: 'Feature not yet implemented',
          message: 'Bulk settle pending bets will be available in a future update'
        });
        break;
        
      case 'backup-data':
        // Trigger data export
        return BulkImportController.exportData(req, res);
        
      case 'recalculate-all-balances':
        // Recalculate all account balances
        const AccountModel = require('../models/Account.model');
        const accounts = await AccountModel.findByUserId(req.user.userId);
        
        const results = [];
        for (const [accountKey, accountData] of Object.entries(accounts)) {
          const recalculated = await AccountModel.recalculateBalance(accountData.id);
          results.push({
            accountKey,
            name: accountData.name,
            ...recalculated
          });
        }
        
        res.json({
          success: true,
          message: 'All account balances recalculated',
          results
        });
        break;
        
      default:
        res.status(400).json({
          error: 'Unknown action',
          availableActions: ['settle-all-pending', 'backup-data', 'recalculate-all-balances']
        });
    }
  })
);

module.exports = router;
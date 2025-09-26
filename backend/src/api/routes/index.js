const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const accountsRoutes = require('./accounts.routes');
const transactionsRoutes = require('./transactions.routes');
const betsRoutes = require('./bets.routes');
const tenantRoutes = require('./tenant.routes'); // NEW

// Import controllers for additional routes
const BulkImportController = require('../controllers/bulkImport.controller');

// Import middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const TenantMiddleware = require('../middleware/tenant.middleware'); // NEW
const { validateBulkImport } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * API Routes
 */

// Authentication routes (no tenant context needed)
router.use('/auth', authRoutes);

// Tenant management routes
router.use('/tenant', tenantRoutes);

// Protected routes (require authentication and tenant context)
router.use('/accounts', accountsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/bets', betsRoutes);

/**
 * Bulk Import Routes with Tenant Context
 */
router.post('/bulk-import',
  authenticateToken,
  TenantMiddleware.extractTenant,
  TenantMiddleware.checkFeatureAccess('csv_import'),
  validateBulkImport,
  asyncHandler(BulkImportController.bulkImport)
);

router.delete('/reset',
  authenticateToken,
  TenantMiddleware.extractTenant,
  asyncHandler(BulkImportController.resetAllData)
);

router.get('/export',
  authenticateToken,
  TenantMiddleware.extractTenant,
  TenantMiddleware.checkFeatureAccess('csv_export'),
  asyncHandler(BulkImportController.exportData)
);

/**
 * Health Check Route (no auth needed)
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sportsbook Tracker API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

/**
 * Multi-tenant API Information Route
 */
router.get('/info', 
  authenticateToken,
  TenantMiddleware.extractTenant,
  (req, res) => {
    const { tenant } = req;
    
    res.json({
      success: true,
      api: {
        name: 'Sportsbook Tracker API',
        version: '2.0.0',
        description: 'Multi-tenant SaaS API for managing sportsbook accounts',
        tenant: {
          name: tenant.name,
          plan: tenant.plan,
          features: tenant.features,
          limits: tenant.limits
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;
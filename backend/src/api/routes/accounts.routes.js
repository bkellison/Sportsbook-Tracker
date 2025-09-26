const express = require('express');
const router = express.Router();

// Controllers
const AccountsController = require('../controllers/AccountsController');

// Middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const TenantMiddleware = require('../middleware/tenant.middleware');
const { 
  validateAccount,
  validateParams,
  validateQuery,
  paramValidations,
  validate,
  rules
} = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Apply authentication and tenant extraction to all routes
router.use(authenticateToken);
router.use(TenantMiddleware.extractTenant);
router.use(TenantMiddleware.trackResourceUsage);

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts for the authenticated user in current tenant
 * @access  Private
 */
router.get('/',
  TenantMiddleware.checkResourceLimits('api_requests'),
  asyncHandler(AccountsController.getAllAccounts.bind(AccountsController))
);

/**
 * @route   GET /api/accounts/summary
 * @desc    Get accounts summary for dashboard
 * @access  Private
 */
router.get('/summary',
  TenantMiddleware.checkResourceLimits('api_requests'),
  asyncHandler(AccountsController.getAccountSummary.bind(AccountsController))
);

/**
 * @route   GET /api/accounts/:accountKey
 * @desc    Get specific account with full data
 * @access  Private
 */
router.get('/:accountKey',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  TenantMiddleware.checkResourceLimits('api_requests'),
  asyncHandler(AccountsController.getAccountById.bind(AccountsController))
);

/**
 * @route   POST /api/accounts
 * @desc    Create new account
 * @access  Private
 */
router.post('/',
  validateAccount,
  TenantMiddleware.checkFeatureAccess('basic_tracking'),
  TenantMiddleware.checkResourceLimits('accounts'),
  asyncHandler(AccountsController.createAccount.bind(AccountsController))
);

/**
 * @route   PUT /api/accounts/:accountKey
 * @desc    Update account information
 * @access  Private
 */
router.put('/:accountKey',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  validate({
    name: [
      rules.string(),
      rules.maxLength(100, 'Account name must be no more than 100 characters')
    ],
    balance: [
      rules.number('Balance must be a valid number')
    ]
  }),
  TenantMiddleware.checkFeatureAccess('basic_tracking'),
  asyncHandler(AccountsController.updateAccount.bind(AccountsController))
);

module.exports = router;
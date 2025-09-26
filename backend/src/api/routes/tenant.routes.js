const express = require('express');
const router = express.Router();

// Controllers
const TenantController = require('../controllers/TenantController');

// Middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const TenantMiddleware = require('../middleware/tenant.middleware');
const { 
  validate,
  rules
} = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/tenant
 * @desc    Create new tenant
 * @access  Private
 */
router.post('/',
  validate({
    name: [
      rules.required('Tenant name is required'),
      rules.string(),
      rules.maxLength(255, 'Name must be less than 255 characters')
    ],
    subdomain: [
      rules.required('Subdomain is required'),
      rules.string(),
      rules.minLength(3, 'Subdomain must be at least 3 characters'),
      rules.maxLength(50, 'Subdomain must be less than 50 characters'),
      rules.custom((value) => ({
        valid: /^[a-zA-Z0-9-]+$/.test(value),
        message: 'Subdomain can only contain letters, numbers, and hyphens'
      }))
    ]
  }),
  asyncHandler(TenantController.createTenant.bind(TenantController))
);

// Routes that require tenant context
router.use(TenantMiddleware.extractTenant);

/**
 * @route   GET /api/tenant
 * @desc    Get current tenant information
 * @access  Private
 */
router.get('/',
  asyncHandler(TenantController.getCurrentTenant.bind(TenantController))
);

/**
 * @route   PUT /api/tenant
 * @desc    Update tenant information
 * @access  Private
 */
router.put('/',
  validate({
    name: [
      rules.string(),
      rules.maxLength(255, 'Name must be less than 255 characters')
    ],
    domain: [
      rules.string(),
      rules.maxLength(255, 'Domain must be less than 255 characters')
    ]
  }),
  asyncHandler(TenantController.updateTenant.bind(TenantController))
);

/**
 * @route   GET /api/tenant/usage
 * @desc    Get tenant usage statistics
 * @access  Private
 */
router.get('/usage',
  asyncHandler(TenantController.getUsageStats.bind(TenantController))
);

/**
 * @route   POST /api/tenant/upgrade
 * @desc    Upgrade tenant subscription
 * @access  Private
 */
router.post('/upgrade',
  validate({
    plan: [
      rules.required('Plan is required'),
      rules.oneOf(['basic', 'pro', 'enterprise'], 'Invalid plan')
    ]
  }),
  asyncHandler(TenantController.upgradeSubscription.bind(TenantController))
);

/**
 * @route   POST /api/tenant/invite
 * @desc    Invite user to tenant
 * @access  Private
 */
router.post('/invite',
  validate({
    email: [
      rules.required('Email is required'),
      rules.email('Invalid email format')
    ],
    role: [
      rules.oneOf(['admin', 'user', 'viewer'], 'Invalid role')
    ]
  }),
  TenantMiddleware.checkFeatureAccess('user_management'),
  asyncHandler(TenantController.inviteUser.bind(TenantController))
);

module.exports = router;
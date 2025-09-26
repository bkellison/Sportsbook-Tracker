const express = require('express');
const router = express.Router();

// Controllers
const AccountsController = require('../controllers/accounts.controller');

// Middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  validateAccount,
  validateParams,
  validateQuery,
  paramValidations,
  validate,
  rules
} = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts for the authenticated user
 * @access  Private
 */
router.get('/',
  asyncHandler(AccountsController.getAllAccounts)
);

/**
 * @route   GET /api/accounts/summary
 * @desc    Get accounts summary for dashboard
 * @access  Private
 */
router.get('/summary',
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    const summary = await AccountModel.getSummary(req.user.userId);
    res.json({
      success: true,
      summary
    });
  })
);

/**
 * @route   GET /api/accounts/activity
 * @desc    Get recent account activity
 * @access  Private
 */
router.get('/activity',
  validateQuery({
    limit: [
      rules.custom((value) => {
        if (value && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 50)) {
          return { valid: false, message: 'Limit must be between 1 and 50' };
        }
        return { valid: true };
      })
    ]
  }),
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    const limit = parseInt(req.query.limit) || 10;
    const activity = await AccountModel.getRecentActivity(req.user.userId, limit);
    res.json({
      success: true,
      activity
    });
  })
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
  asyncHandler(AccountsController.getAccountById)
);

/**
 * @route   GET /api/accounts/:accountKey/stats
 * @desc    Get detailed statistics for a specific account
 * @access  Private
 */
router.get('/:accountKey/stats',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    const account = await AccountModel.findByUserAndKey(req.user.userId, req.params.accountKey);
    
    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }
    
    const stats = await AccountModel.getStats(account.id);
    res.json({
      success: true,
      stats
    });
  })
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
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    const account = await AccountModel.findByUserAndKey(req.user.userId, req.params.accountKey);
    
    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }
    
    const updatedAccount = await AccountModel.update(account.id, req.body);
    res.json({
      success: true,
      message: 'Account updated successfully',
      account: updatedAccount
    });
  })
);

/**
 * @route   DELETE /api/accounts/:accountKey
 * @desc    Clear account data (reset balances, delete transactions and bets)
 * @access  Private
 */
router.delete('/:accountKey',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  asyncHandler(AccountsController.clearAccount)
);

/**
 * @route   POST /api/accounts/:accountKey/recalculate
 * @desc    Recalculate account balance from transactions and bets
 * @access  Private
 */
router.post('/:accountKey/recalculate',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    const account = await AccountModel.findByUserAndKey(req.user.userId, req.params.accountKey);
    
    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }
    
    const recalculatedBalances = await AccountModel.recalculateBalance(account.id);
    res.json({
      success: true,
      message: 'Account balance recalculated successfully',
      balances: recalculatedBalances
    });
  })
);

/**
 * @route   GET /api/accounts/:accountKey/transactions
 * @desc    Get transactions for a specific account
 * @access  Private
 */
router.get('/:accountKey/transactions',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  validateQuery({
    page: [
      rules.custom((value) => {
        if (value && (isNaN(value) || parseInt(value) < 1)) {
          return { valid: false, message: 'Page must be a positive integer' };
        }
        return { valid: true };
      })
    ],
    limit: [
      rules.custom((value) => {
        if (value && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 100)) {
          return { valid: false, message: 'Limit must be between 1 and 100' };
        }
        return { valid: true };
      })
    ],
    type: [
      rules.oneOf(['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'])
    ]
  }),
  asyncHandler(async (req, res) => {
    const TransactionModel = require('../models/Transaction.model');
    const AccountModel = require('../models/Account.model');
    
    const account = await AccountModel.findByUserAndKey(req.user.userId, req.params.accountKey);
    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await TransactionModel.findByAccountId(account.id, options);
    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * @route   GET /api/accounts/:accountKey/bets
 * @desc    Get bets for a specific account
 * @access  Private
 */
router.get('/:accountKey/bets',
  validateParams({
    accountKey: paramValidations.accountKey
  }),
  validateQuery({
    page: [
      rules.custom((value) => {
        if (value && (isNaN(value) || parseInt(value) < 1)) {
          return { valid: false, message: 'Page must be a positive integer' };
        }
        return { valid: true };
      })
    ],
    limit: [
      rules.custom((value) => {
        if (value && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 100)) {
          return { valid: false, message: 'Limit must be between 1 and 100' };
        }
        return { valid: true };
      })
    ],
    status: [
      rules.oneOf(['pending', 'won', 'lost'])
    ]
  }),
  asyncHandler(async (req, res) => {
    const BetModel = require('../models/Bet.model');
    const AccountModel = require('../models/Account.model');
    
    const account = await AccountModel.findByUserAndKey(req.user.userId, req.params.accountKey);
    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await BetModel.findByAccountId(account.id, options);
    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * @route   POST /api/accounts
 * @desc    Create a new account
 * @access  Private
 */
router.post('/',
  validate({
    account_key: [
      rules.required('Account key is required'),
      rules.string(),
      rules.custom((value) => ({
        valid: /^[a-zA-Z0-9_-]+$/.test(value),
        message: 'Account key must contain only letters, numbers, hyphens, and underscores'
      }))
    ],
    name: [
      rules.required('Account name is required'),
      rules.string(),
      rules.maxLength(100, 'Account name must be no more than 100 characters')
    ],
    balance: [
      rules.number('Initial balance must be a valid number')
    ]
  }),
  asyncHandler(async (req, res) => {
    const AccountModel = require('../models/Account.model');
    
    // Check if account key already exists for this user
    const existingAccount = await AccountModel.findByUserAndKey(req.user.userId, req.body.account_key);
    if (existingAccount) {
      return res.status(400).json({
        error: 'Account key already exists'
      });
    }
    
    const account = await AccountModel.create(req.user.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      account
    });
  })
);

module.exports = router;
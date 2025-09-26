const express = require('express');
const router = express.Router();

// Controllers
const TransactionsController = require('../controllers/transactions.controller');

// Middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  validateTransaction,
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
 * @route   GET /api/transactions
 * @desc    Get all transactions for the authenticated user
 * @access  Private
 */
router.get('/',
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
    accountKey: [
      rules.string(),
      rules.custom((value) => ({
        valid: /^[a-zA-Z0-9_-]+$/.test(value),
        message: 'Account key must contain only letters, numbers, hyphens, and underscores'
      }))
    ],
    type: [
      rules.oneOf(['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'])
    ],
    startDate: [
      rules.date('Start date must be a valid date')
    ],
    endDate: [
      rules.date('End date must be a valid date')
    ]
  }),
  asyncHandler(TransactionsController.getAllTransactions)
);

/**
 * @route   GET /api/transactions/summary
 * @desc    Get transaction summary/statistics
 * @access  Private
 */
router.get('/summary',
  validateQuery({
    accountKey: [
      rules.string(),
      rules.custom((value) => ({
        valid: /^[a-zA-Z0-9_-]+$/.test(value),
        message: 'Account key must contain only letters, numbers, hyphens, and underscores'
      }))
    ],
    startDate: [
      rules.date('Start date must be a valid date')
    ],
    endDate: [
      rules.date('End date must be a valid date')
    ]
  }),
  asyncHandler(TransactionsController.getTransactionsSummary)
);

/**
 * @route   GET /api/transactions/recent
 * @desc    Get recent transactions
 * @access  Private
 */
router.get('/recent',
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
    const TransactionModel = require('../models/Transaction.model');
    const limit = parseInt(req.query.limit) || 10;
    const transactions = await TransactionModel.getRecent(req.user.userId, limit);
    
    res.json({
      success: true,
      transactions
    });
  })
);

/**
 * @route   GET /api/transactions/stats
 * @desc    Get transaction statistics for user
 * @access  Private
 */
router.get('/stats',
  validateQuery({
    accountKey: [
      rules.string()
    ],
    startDate: [
      rules.date('Start date must be a valid date')
    ],
    endDate: [
      rules.date('End date must be a valid date')
    ]
  }),
  asyncHandler(async (req, res) => {
    const TransactionModel = require('../models/Transaction.model');
    const options = {
      accountKey: req.query.accountKey,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const stats = await TransactionModel.getStatsByUserId(req.user.userId, options);
    res.json({
      success: true,
      stats
    });
  })
);

/**
 * @route   GET /api/transactions/monthly/:year/:month
 * @desc    Get monthly transaction summary
 * @access  Private
 */
router.get('/monthly/:year/:month',
  validateParams({
    year: [
      rules.required(),
      rules.custom((value) => {
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        return {
          valid: !isNaN(year) && year >= 2020 && year <= currentYear + 1,
          message: `Year must be between 2020 and ${currentYear + 1}`
        };
      })
    ],
    month: [
      rules.required(),
      rules.custom((value) => {
        const month = parseInt(value);
        return {
          valid: !isNaN(month) && month >= 1 && month <= 12,
          message: 'Month must be between 1 and 12'
        };
      })
    ]
  }),
  asyncHandler(async (req, res) => {
    const TransactionModel = require('../models/Transaction.model');
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const summary = await TransactionModel.getMonthlySummary(req.user.userId, year, month);
    res.json({
      success: true,
      summary,
      year,
      month
    });
  })
);

/**
 * @route   GET /api/transactions/:transactionId
 * @desc    Get specific transaction by ID
 * @access  Private
 */
router.get('/:transactionId',
  validateParams({
    transactionId: paramValidations.id
  }),
  asyncHandler(TransactionsController.getTransactionById)
);

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post('/',
  validateTransaction,
  asyncHandler(TransactionsController.createTransaction)
);

/**
 * @route   PUT /api/transactions/:transactionId
 * @desc    Update a transaction
 * @access  Private
 */
router.put('/:transactionId',
  validateParams({
    transactionId: paramValidations.id
  }),
  validate({
    type: [
      rules.oneOf(['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'])
    ],
    amount: [
      rules.positiveNumber('Amount must be a positive number')
    ],
    description: [
      rules.string(),
      rules.maxLength(500, 'Description must be no more than 500 characters')
    ]
  }),
  asyncHandler(TransactionsController.updateTransaction)
);

/**
 * @route   DELETE /api/transactions/:transactionId
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete('/:transactionId',
  validateParams({
    transactionId: paramValidations.id
  }),
  asyncHandler(TransactionsController.deleteTransaction)
);

/**
 * @route   GET /api/transactions/account/:accountKey
 * @desc    Get transactions for a specific account
 * @access  Private
 */
router.get('/account/:accountKey',
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
  asyncHandler(TransactionsController.getTransactionsByAccount)
);

/**
 * @route   GET /api/transactions/date-range/:startDate/:endDate
 * @desc    Get transactions within a date range
 * @access  Private
 */
router.get('/date-range/:startDate/:endDate',
  validateParams({
    startDate: [
      rules.required(),
      rules.date('Start date must be a valid date')
    ],
    endDate: [
      rules.required(),
      rules.date('End date must be a valid date')
    ]
  }),
  validateQuery({
    accountKey: [
      rules.string()
    ],
    type: [
      rules.oneOf(['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'])
    ]
  }),
  asyncHandler(async (req, res) => {
    const TransactionModel = require('../models/Transaction.model');
    const { startDate, endDate } = req.params;
    const { accountKey, type } = req.query;
    
    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        error: 'Start date must be before or equal to end date'
      });
    }
    
    const options = { accountKey, type };
    const transactions = await TransactionModel.getByDateRange(req.user.userId, startDate, endDate, options);
    
    res.json({
      success: true,
      transactions,
      dateRange: {
        startDate,
        endDate
      }
    });
  })
);

/**
 * @route   POST /api/transactions/bulk
 * @desc    Create multiple transactions
 * @access  Private
 */
router.post('/bulk',
  validate({
    transactions: [
      rules.required('Transactions array is required'),
      rules.custom((value) => {
        if (!Array.isArray(value)) {
          return { valid: false, message: 'Transactions must be an array' };
        }
        if (value.length === 0) {
          return { valid: false, message: 'At least one transaction is required' };
        }
        if (value.length > 100) {
          return { valid: false, message: 'Maximum 100 transactions allowed per bulk operation' };
        }
        return { valid: true };
      })
    ]
  }),
  asyncHandler(async (req, res) => {
    const TransactionModel = require('../models/Transaction.model');
    const AccountModel = require('../models/Account.model');
    const { transactions } = req.body;
    
    // Validate each transaction in the array
    const errors = [];
    const validatedTransactions = [];
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const transactionErrors = TransactionModel.validateTransactionData(transaction);
      
      if (transactionErrors.length > 0) {
        errors.push({
          index: i,
          errors: transactionErrors
        });
        continue;
      }
      
      // Verify account belongs to user
      const account = await AccountModel.findByUserAndKey(req.user.userId, transaction.account_key);
      if (!account) {
        errors.push({
          index: i,
          errors: [`Account '${transaction.account_key}' not found`]
        });
        continue;
      }
      
      validatedTransactions.push({
        ...transaction,
        account_id: account.id
      });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation errors in bulk transaction data',
        errors
      });
    }
    
    try {
      const results = await TransactionModel.bulkCreate(validatedTransactions);
      res.status(201).json({
        success: true,
        message: `Successfully created ${results.length} transactions`,
        transactions: results
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create bulk transactions',
        message: error.message
      });
    }
  })
);

module.exports = router;
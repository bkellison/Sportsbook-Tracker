const express = require('express');
const router = express.Router();

// Controllers
const BetsController = require('../controllers/bets.controller');

// Middleware
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  validateBet,
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
 * @route   GET /api/bets
 * @desc    Get all bets for the authenticated user
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
    status: [
      rules.oneOf(['pending', 'won', 'lost'])
    ],
    startDate: [
      rules.date('Start date must be a valid date')
    ],
    endDate: [
      rules.date('End date must be a valid date')
    ]
  }),
  asyncHandler(BetsController.getAllBets)
);

/**
 * @route   GET /api/bets/pending
 * @desc    Get all pending bets for the authenticated user
 * @access  Private
 */
router.get('/pending',
  asyncHandler(async (req, res) => {
    const BetModel = require('../models/Bet.model');
    const pendingBets = await BetModel.getPendingByUserId(req.user.userId);
    
    res.json({
      success: true,
      bets: pendingBets
    });
  })
);

/**
 * @route   GET /api/bets/recent
 * @desc    Get recent bets
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
    const BetModel = require('../models/Bet.model');
    const limit = parseInt(req.query.limit) || 10;
    const bets = await BetModel.getRecent(req.user.userId, limit);
    
    res.json({
      success: true,
      bets
    });
  })
);

/**
 * @route   GET /api/bets/stats
 * @desc    Get betting statistics for user
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
    const BetModel = require('../models/Bet.model');
    const options = {
      accountKey: req.query.accountKey,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const stats = await BetModel.getStatsByUserId(req.user.userId, options);
    res.json({
      success: true,
      stats
    });
  })
);

/**
 * @route   GET /api/bets/streak
 * @desc    Get betting streak information
 * @access  Private
 */
router.get('/streak',
  validateQuery({
    accountKey: [
      rules.string()
    ]
  }),
  asyncHandler(async (req, res) => {
    const BetModel = require('../models/Bet.model');
    const streak = await BetModel.getStreakInfo(req.user.userId, req.query.accountKey);
    
    res.json({
      success: true,
      streak
    });
  })
);

/**
 * @route   GET /api/bets/monthly/:year/:month
 * @desc    Get monthly betting summary
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
    const BetModel = require('../models/Bet.model');
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const summary = await BetModel.getMonthlySummary(req.user.userId, year, month);
    res.json({
      success: true,
      summary,
      year,
      month
    });
  })
);

/**
 * @route   GET /api/bets/:betId
 * @desc    Get specific bet by ID
 * @access  Private
 */
router.get('/:betId',
  validateParams({
    betId: paramValidations.id
  }),
  asyncHandler(BetsController.getBetById)
);

/**
 * @route   POST /api/bets
 * @desc    Create a new bet
 * @access  Private
 */
router.post('/',
  validate({
    account: [
      rules.required('Account is required'),
      rules.string()
    ],
    amount: [
      rules.required('Amount is required'),
      rules.positiveNumber('Amount must be a positive number')
    ],
    displayAmount: [
      rules.positiveNumber('Display amount must be a positive number')
    ],
    description: [
      rules.string(),
      rules.maxLength(500, 'Description must be no more than 500 characters')
    ],
    isBonusBet: [
      rules.boolean('Is bonus bet must be a boolean value')
    ]
  }),
  asyncHandler(async (req, res) => {
    const BetModel = require('../models/Bet.model');
    const AccountModel = require('../models/Account.model');
    
    // Find the account
    const account = await AccountModel.findByUserAndKey(req.user.userId, req.body.account);
    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }
    
    // Check if user has sufficient balance for non-bonus bets
    if (!req.body.isBonusBet && account.balance < parseFloat(req.body.amount)) {
      return res.status(400).json({
        error: 'Insufficient balance for this bet'
      });
    }
    
    const betData = {
      account_id: account.id,
      amount: req.body.isBonusBet ? 0 : parseFloat(req.body.amount), // No money risked for bonus bets
      display_amount: parseFloat(req.body.displayAmount || req.body.amount),
      description: req.body.description,
      is_bonus_bet: req.body.isBonusBet || false
    };
    
    const bet = await BetModel.create(betData);
    
    // Update account balance for non-bonus bets
    if (!req.body.isBonusBet) {
      await AccountModel.updateBalance(account.id, -parseFloat(req.body.amount));
    }
    
    res.status(201).json({
      success: true,
      message: 'Bet created successfully',
      bet
    });
  })
);

/**
 * @route   PUT /api/bets/:betId
 * @desc    Update bet status and winnings
 * @access  Private
 */
router.put('/:betId',
  validateParams({
    betId: paramValidations.id
  }),
  validate({
    status: [
      rules.oneOf(['pending', 'won', 'lost'], 'Status must be pending, won, or lost')
    ],
    winnings: [
      rules.nonNegativeNumber('Winnings must be zero or positive')
    ]
  }),
  asyncHandler(BetsController.updateBetStatus)
);

/**
 * @route   DELETE /api/bets/:betId
 * @desc    Delete a bet
 * @access  Private
 */
router.delete('/:betId',
  validateParams({
    betId: paramValidations.id
  }),
  asyncHandler(BetsController.deleteBet)
);

/**
 * @route   GET /api/bets/account/:accountKey
 * @desc    Get bets for a specific account
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
    status: [
      rules.oneOf(['pending', 'won', 'lost'])
    ]
  }),
  asyncHandler(BetsController.getBetsByAccount)
);

/**
 * @route   POST /api/bets/:betId/settle
 * @desc    Settle a bet (mark as won or lost with winnings)
 * @access  Private
 */
router.post('/:betId/settle',
  validateParams({
    betId: paramValidations.id
  }),
  validate({
    status: [
      rules.required('Status is required'),
      rules.oneOf(['won', 'lost'], 'Status must be won or lost')
    ],
    winnings: [
      rules.custom((value, body) => {
        if (body.status === 'won') {
          if (!value || isNaN(value) || parseFloat(value) <= 0) {
            return { valid: false, message: 'Winnings amount is required for won bets and must be positive' };
          }
        }
        return { valid: true };
      })
    ]
  }),
  asyncHandler(async (req, res) => {
    const BetModel = require('../models/Bet.model');
    const AccountModel = require('../models/Account.model');
    
    // Get the bet first
    const bet = await BetModel.findById(req.params.betId);
    if (!bet || bet.userId !== req.user.userId) {
      return res.status(404).json({
        error: 'Bet not found'
      });
    }
    
    if (bet.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only settle pending bets'
      });
    }
    
    const { status, winnings = 0 } = req.body;
    
    // Update bet status
    const updatedBet = await BetModel.updateStatus(req.params.betId, status, parseFloat(winnings));
    
    // Update account balance if bet won
    if (status === 'won' && parseFloat(winnings) > 0) {
      await AccountModel.updateBalance(bet.accountId, parseFloat(winnings));
    }
    
    res.json({
      success: true,
      message: `Bet marked as ${status}`,
      bet: updatedBet
    });
  })
);

/**
 * @route   POST /api/bets/bulk
 * @desc    Create multiple bets
 * @access  Private
 */
router.post('/bulk',
  validate({
    bets: [
      rules.required('Bets array is required'),
      rules.custom((value) => {
        if (!Array.isArray(value)) {
          return { valid: false, message: 'Bets must be an array' };
        }
        if (value.length === 0) {
          return { valid: false, message: 'At least one bet is required' };
        }
        if (value.length > 50) {
          return { valid: false, message: 'Maximum 50 bets allowed per bulk operation' };
        }
        return { valid: true };
      })
    ]
  }),
  asyncHandler(async (req, res) => {
    const BetModel = require('../models/Bet.model');
    const AccountModel = require('../models/Account.model');
    const { bets } = req.body;
    
    // Validate each bet in the array
    const errors = [];
    const validatedBets = [];
    
    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      const betErrors = BetModel.validateBetData(bet);
      
      if (betErrors.length > 0) {
        errors.push({
          index: i,
          errors: betErrors
        });
        continue;
      }
      
      // Verify account belongs to user
      const account = await AccountModel.findByUserAndKey(req.user.userId, bet.account_key);
      if (!account) {
        errors.push({
          index: i,
          errors: [`Account '${bet.account_key}' not found`]
        });
        continue;
      }
      
      validatedBets.push({
        ...bet,
        account_id: account.id
      });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation errors in bulk bet data',
        errors
      });
    }
    
    try {
      const results = await BetModel.bulkCreate(validatedBets);
      res.status(201).json({
        success: true,
        message: `Successfully created ${results.length} bets`,
        bets: results
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create bulk bets',
        message: error.message
      });
    }
  })
);

module.exports = router;
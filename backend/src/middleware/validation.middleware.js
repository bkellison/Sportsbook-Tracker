const { ValidationError } = require('./error.middleware');

/**
 * Generic validation middleware factory
 */
const validate = (validationRules) => {
  return (req, res, next) => {
    const errors = [];
    
    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = getNestedValue(req.body, field);
      
      rules.forEach(rule => {
        const result = rule.validator(value, req.body, req);
        if (!result.valid) {
          errors.push({
            field,
            message: result.message,
            value: value
          });
        }
      });
    });
    
    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }
    
    next();
  };
};

/**
 * Common validation rules
 */
const rules = {
  required: (message = 'This field is required') => ({
    validator: (value) => ({
      valid: value !== undefined && value !== null && value !== '',
      message
    })
  }),
  
  string: (message = 'Must be a string') => ({
    validator: (value) => ({
      valid: typeof value === 'string',
      message
    })
  }),
  
  number: (message = 'Must be a number') => ({
    validator: (value) => ({
      valid: !isNaN(parseFloat(value)) && isFinite(value),
      message
    })
  }),
  
  positiveNumber: (message = 'Must be a positive number') => ({
    validator: (value) => {
      const num = parseFloat(value);
      return {
        valid: !isNaN(num) && isFinite(num) && num > 0,
        message
      };
    }
  }),
  
  nonNegativeNumber: (message = 'Must be zero or positive') => ({
    validator: (value) => {
      const num = parseFloat(value);
      return {
        valid: !isNaN(num) && isFinite(num) && num >= 0,
        message
      };
    }
  }),
  
  email: (message = 'Must be a valid email address') => ({
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: typeof value === 'string' && emailRegex.test(value),
        message
      };
    }
  }),
  
  minLength: (min, message) => ({
    validator: (value) => ({
      valid: typeof value === 'string' && value.length >= min,
      message: message || `Must be at least ${min} characters long`
    })
  }),
  
  maxLength: (max, message) => ({
    validator: (value) => ({
      valid: typeof value === 'string' && value.length <= max,
      message: message || `Must be no more than ${max} characters long`
    })
  }),
  
  oneOf: (allowedValues, message) => ({
    validator: (value) => ({
      valid: allowedValues.includes(value),
      message: message || `Must be one of: ${allowedValues.join(', ')}`
    })
  }),
  
  date: (message = 'Must be a valid date') => ({
    validator: (value) => {
      const date = new Date(value);
      return {
        valid: date instanceof Date && !isNaN(date.getTime()),
        message
      };
    }
  }),
  
  boolean: (message = 'Must be a boolean') => ({
    validator: (value) => ({
      valid: typeof value === 'boolean',
      message
    })
  }),
  
  conditional: (condition, ruleToApply) => ({
    validator: (value, body, req) => {
      if (condition(value, body, req)) {
        return ruleToApply.validator(value, body, req);
      }
      return { valid: true };
    }
  }),
  
  custom: (validatorFn, message) => ({
    validator: (value, body, req) => {
      try {
        const result = validatorFn(value, body, req);
        if (typeof result === 'boolean') {
          return { valid: result, message };
        }
        return result;
      } catch (error) {
        return { valid: false, message: error.message || message };
      }
    }
  })
};

/**
 * Pre-defined validation schemas for common entities
 */
const schemas = {
  // User registration validation
  userRegistration: {
    email: [
      rules.required(),
      rules.string(),
      rules.email()
    ],
    username: [
      rules.required(),
      rules.string(),
      rules.minLength(3, 'Username must be at least 3 characters long'),
      rules.maxLength(30, 'Username must be no more than 30 characters long')
    ],
    password: [
      rules.required(),
      rules.string(),
      rules.minLength(6, 'Password must be at least 6 characters long')
    ]
  },
  
  // User login validation
  userLogin: {
    email: [
      rules.required(),
      rules.string(),
      rules.email()
    ],
    password: [
      rules.required(),
      rules.string()
    ]
  },
  
  // Transaction validation
  transaction: {
    account: [
      rules.required(),
      rules.string()
    ],
    type: [
      rules.required(),
      rules.string(),
      rules.oneOf(['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'])
    ],
    amount: [
      rules.required(),
      rules.positiveNumber()
    ],
    description: [
      rules.string(),
      rules.maxLength(500, 'Description must be no more than 500 characters')
    ]
  },
  
  // Bet validation
  bet: {
    amount: [
      rules.required(),
      rules.positiveNumber()
    ],
    description: [
      rules.string(),
      rules.maxLength(500, 'Description must be no more than 500 characters')
    ],
    status: [
      rules.oneOf(['pending', 'won', 'lost'], 'Status must be pending, won, or lost')
    ],
    winnings: [
      rules.nonNegativeNumber()
    ]
  },
  
  // Account validation
  account: {
    name: [
      rules.required(),
      rules.string(),
      rules.maxLength(100, 'Account name must be no more than 100 characters')
    ],
    balance: [
      rules.number()
    ]
  },
  
  // Bulk import validation
  bulkImport: {
    data: [
      rules.required('Import data is required'),
      rules.string('Import data must be a string'),
      rules.custom((value) => {
        if (!value.trim()) {
          return { valid: false, message: 'Import data cannot be empty' };
        }
        return { valid: true };
      })
    ]
  }
};

/**
 * Specific validation middlewares for common operations
 */
const validateUserRegistration = validate(schemas.userRegistration);
const validateUserLogin = validate(schemas.userLogin);
const validateTransaction = validate(schemas.transaction);
const validateBet = validate(schemas.bet);
const validateAccount = validate(schemas.account);
const validateBulkImport = validate(schemas.bulkImport);

/**
 * Middleware to validate request parameters
 */
const validateParams = (paramValidations) => {
  return (req, res, next) => {
    const errors = [];
    
    Object.keys(paramValidations).forEach(param => {
      const rules = paramValidations[param];
      const value = req.params[param];
      
      rules.forEach(rule => {
        const result = rule.validator(value, req.params, req);
        if (!result.valid) {
          errors.push({
            field: param,
            message: result.message,
            value: value,
            type: 'param'
          });
        }
      });
    });
    
    if (errors.length > 0) {
      return next(new ValidationError('Parameter validation failed', errors));
    }
    
    next();
  };
};

/**
 * Middleware to validate query parameters
 */
const validateQuery = (queryValidations) => {
  return (req, res, next) => {
    const errors = [];
    
    Object.keys(queryValidations).forEach(param => {
      const rules = queryValidations[param];
      const value = req.query[param];
      
      // Skip validation if query param is not provided (unless required)
      if (value === undefined) {
        const hasRequiredRule = rules.some(rule => rule === rules.required);
        if (!hasRequiredRule) {
          return;
        }
      }
      
      rules.forEach(rule => {
        const result = rule.validator(value, req.query, req);
        if (!result.valid) {
          errors.push({
            field: param,
            message: result.message,
            value: value,
            type: 'query'
          });
        }
      });
    });
    
    if (errors.length > 0) {
      return next(new ValidationError('Query parameter validation failed', errors));
    }
    
    next();
  };
};

/**
 * Common parameter validations
 */
const paramValidations = {
  id: [
    rules.required(),
    rules.custom((value) => {
      const id = parseInt(value);
      return {
        valid: !isNaN(id) && id > 0,
        message: 'ID must be a positive integer'
      };
    })
  ],
  
  accountKey: [
    rules.required(),
    rules.string(),
    rules.custom((value) => ({
      valid: /^[a-zA-Z0-9_-]+$/.test(value),
      message: 'Account key must contain only letters, numbers, hyphens, and underscores'
    }))
  ]
};

/**
 * Middleware to sanitize input data
 */
const sanitize = (sanitizationRules) => {
  return (req, res, next) => {
    Object.keys(sanitizationRules).forEach(field => {
      const value = getNestedValue(req.body, field);
      if (value !== undefined) {
        const sanitizedValue = sanitizationRules[field](value);
        setNestedValue(req.body, field, sanitizedValue);
      }
    });
    
    next();
  };
};

/**
 * Common sanitization functions
 */
const sanitizers = {
  trim: (value) => typeof value === 'string' ? value.trim() : value,
  toLowerCase: (value) => typeof value === 'string' ? value.toLowerCase() : value,
  toUpperCase: (value) => typeof value === 'string' ? value.toUpperCase() : value,
  removeExtraSpaces: (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value,
  stripHtml: (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '') : value,
  parseNumber: (value) => {
    if (typeof value === 'string' && !isNaN(value)) {
      return parseFloat(value);
    }
    return value;
  }
};

/**
 * Helper function to get nested object values
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current && current[key], obj);
};

/**
 * Helper function to set nested object values
 */
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!(key in current)) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

module.exports = {
  validate,
  rules,
  schemas,
  validateUserRegistration,
  validateUserLogin,
  validateTransaction,
  validateBet,
  validateAccount,
  validateBulkImport,
  validateParams,
  validateQuery,
  paramValidations,
  sanitize,
  sanitizers
};
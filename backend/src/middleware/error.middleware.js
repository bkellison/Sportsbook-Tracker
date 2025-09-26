/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error class for validation errors
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Custom error class for database errors
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Middleware to handle 404 errors (route not found)
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Global error handling middleware
 * This should be the last middleware in the application
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error('=== ERROR OCCURRED ===');
  console.error('URL:', req.method, req.originalUrl);
  console.error('User:', req.user ? req.user.userId : 'anonymous');
  console.error('IP:', req.ip || req.connection.remoteAddress);
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400, 'INVALID_ID');
  }

  // Handle MySQL/Database errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        const field = extractDuplicateField(err.sqlMessage);
        error = new AppError(
          `Duplicate entry: ${field} already exists`,
          409,
          'DUPLICATE_ENTRY'
        );
        break;
        
      case 'ER_NO_REFERENCED_ROW_2':
        error = new AppError(
          'Referenced record does not exist',
          400,
          'FOREIGN_KEY_CONSTRAINT'
        );
        break;
        
      case 'ER_ROW_IS_REFERENCED_2':
        error = new AppError(
          'Cannot delete record - it is referenced by other data',
          409,
          'REFERENCED_RECORD'
        );
        break;
        
      case 'ER_DATA_TOO_LONG':
        error = new AppError(
          'Data too long for field',
          400,
          'DATA_TOO_LONG'
        );
        break;
        
      case 'ER_BAD_NULL_ERROR':
        error = new AppError(
          'Required field cannot be null',
          400,
          'NULL_CONSTRAINT'
        );
        break;
        
      case 'ECONNREFUSED':
        error = new DatabaseError(
          'Database connection failed',
          err
        );
        break;
        
      case 'PROTOCOL_CONNECTION_LOST':
        error = new DatabaseError(
          'Database connection lost',
          err
        );
        break;
    }
  }

  // Handle JWT errors (in case they slip through auth middleware)
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle validation errors from express-validator or similar
  if (err.name === 'ValidationError' || err.errors) {
    const errors = extractValidationErrors(err);
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors
    });
  }

  // Set default error if not already set
  if (!error.statusCode) {
    error.statusCode = 500;
    error.code = 'INTERNAL_SERVER_ERROR';
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const response = {
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    success: false
  };

  // Add additional error info in development
  if (isDevelopment) {
    response.stack = err.stack;
    response.originalError = error.originalError;
  }

  // Add specific error fields for certain error types
  if (error.errors) {
    response.errors = error.errors;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Async error wrapper to catch promise rejections
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Extract field name from duplicate entry error message
 */
const extractDuplicateField = (sqlMessage) => {
  try {
    // MySQL duplicate entry message format: "Duplicate entry 'value' for key 'field_name'"
    const match = sqlMessage.match(/for key '([^']+)'/);
    if (match) {
      const keyName = match[1];
      // Convert key names to user-friendly field names
      const fieldMap = {
        'users.email': 'email',
        'users.username': 'username',
        'unique_user_account': 'account',
        'PRIMARY': 'id'
      };
      return fieldMap[keyName] || keyName.replace(/^[^.]+\./, '');
    }
    return 'field';
  } catch {
    return 'field';
  }
};

/**
 * Extract validation errors from different validation libraries
 */
const extractValidationErrors = (err) => {
  const errors = [];

  if (err.errors) {
    // Handle Mongoose-style validation errors
    Object.keys(err.errors).forEach(field => {
      const error = err.errors[field];
      errors.push({
        field,
        message: error.message,
        value: error.value
      });
    });
  }

  // Handle express-validator errors
  if (Array.isArray(err.array)) {
    try {
      const validationErrors = err.array();
      validationErrors.forEach(error => {
        errors.push({
          field: error.param,
          message: error.msg,
          value: error.value
        });
      });
    } catch {
      // Fallback if array() method fails
    }
  }

  return errors;
};

/**
 * Create custom error for common scenarios
 */
const createError = {
  badRequest: (message, code = 'BAD_REQUEST') => new AppError(message, 400, code),
  unauthorized: (message, code = 'UNAUTHORIZED') => new AppError(message, 401, code),
  forbidden: (message, code = 'FORBIDDEN') => new AppError(message, 403, code),
  notFound: (message, code = 'NOT_FOUND') => new AppError(message, 404, code),
  conflict: (message, code = 'CONFLICT') => new AppError(message, 409, code),
  unprocessable: (message, code = 'UNPROCESSABLE_ENTITY') => new AppError(message, 422, code),
  internal: (message, code = 'INTERNAL_SERVER_ERROR') => new AppError(message, 500, code)
};

/**
 * Middleware to log all requests (for debugging)
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  AppError,
  ValidationError,
  DatabaseError,
  notFound,
  errorHandler,
  asyncHandler,
  createError,
  requestLogger
};
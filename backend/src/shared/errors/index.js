class BaseError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends BaseError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class BusinessLogicError extends BaseError {
  constructor(message, code = 'BUSINESS_LOGIC_ERROR') {
    super(message, 422, code);
  }
}

module.exports = {
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BusinessLogicError
};
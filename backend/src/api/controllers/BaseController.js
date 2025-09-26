class BaseController {
  sendSuccess(res, data, message = 'Success') {
    return res.json({
      success: true,
      message,
      ...data
    });
  }

  sendError(res, error, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }

  sendNotFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      error: message
    });
  }

  sendCreated(res, data, message = 'Created successfully') {
    return res.status(201).json({
      success: true,
      message,
      ...data
    });
  }

  handleError(res, error) {
    if (error.isOperational) {
      return this.sendError(res, error, error.statusCode);
    }
    
    console.error('Unexpected error:', error);
    return this.sendError(res, { message: 'Internal server error' }, 500);
  }
}

module.exports = BaseController;
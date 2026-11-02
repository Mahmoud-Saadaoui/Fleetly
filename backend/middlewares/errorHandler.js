const logger = require('../utils/logger');
const {
  badRequestResponse,
  conflictResponse,
  errorResponse
} = require('../utils/apiResponse');

exports.notFound = (req, res) => {
  logger.warn('404 - Route not found', {
    path: req.originalUrl,
    route: req.route?.path,
    method: req.method,
    ip: req.ip,
    requestId: req.id || req.requestId
  });

  return errorResponse(res, 'Route not found', 404);
};

exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  logger.error('Request error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.originalUrl,
    route: req.route?.path,
    method: req.method,
    ip: req.ip,
    statusCode,
    requestId: req.id || req.requestId
  });

  if (err.type === 'entity.too.large') {
    return errorResponse(res, 'Request payload is too large', 413);
  }

  if (err.name === 'CastError') {
    return badRequestResponse(res, 'Resource not found', {
      field: err.path,
      error: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'resource';
    return conflictResponse(res, 'Resource already exists', {
      field,
      error: `${field} already exists`
    });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((value) => value.message);
    return badRequestResponse(res, 'Validation failed', {
      errors: messages
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  if (err.array && typeof err.array === 'function') {
    return badRequestResponse(res, 'Validation failed', {
      errors: err.array()
    });
  }

  if (err.isOperational) {
    return errorResponse(res, err.message, err.statusCode || 500, {
      code: err.code || undefined,
      requestId: req.id || req.requestId
    });
  }

  return errorResponse(res, 'Internal server error', 500, {
    requestId: req.id || req.requestId
  });
};

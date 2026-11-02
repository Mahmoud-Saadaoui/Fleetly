const crypto = require('crypto');

/**
 * Middleware to add unique request ID to each request
 * Helps with tracing requests through logs
 */
exports.requestId = (req, res, next) => {
  const incomingRequestId = req.get('x-request-id') || req.get('x-correlation-id');
  const requestId = incomingRequestId && /^[a-zA-Z0-9._:-]{1,100}$/.test(incomingRequestId)
    ? incomingRequestId
    : crypto.randomUUID();
  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

const morgan = require('morgan');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists when local file logging is enabled.
const logsDir = path.join(__dirname, '../logs');
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Production logs should be rotated by the process supervisor or log platform.
const accessLogStream = process.env.NODE_ENV === 'production'
  ? process.stdout
  : fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

// Morgan tokens
morgan.token('user-id', (req) => req.userId || 'anonymous');
morgan.token('request-id', (req) => req.id || req.requestId || 'N/A');
morgan.token('route', (req) => req.route?.path || req.baseUrl + req.path || req.originalUrl);

// Define custom format for Morgan
const morganFormat = JSON.stringify({
  requestId: ':request-id',
  time: ':date[iso]',
  method: ':method',
  route: ':route',
  url: ':url',
  status: ':status',
  durationMs: ':response-time',
  userId: ':user-id',
  ip: ':remote-addr'
});

// Middleware for HTTP request logging
const httpLogger = morgan(morganFormat, {
  stream: accessLogStream,
  skip: (req) => {
    // Skip logging for health checks in production to reduce noise
    return process.env.NODE_ENV === 'production' && (req.path.startsWith('/health') || req.path.startsWith('/api/health'));
  }
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  const consoleFormat = '[:date[iso]] :request-id :method :url :status :response-time ms :user-id';
  const consoleLogger = morgan(consoleFormat);

  // Combine both loggers
  module.exports = (req, res, next) => {
    httpLogger(req, res, () => {});
    consoleLogger(req, res, next);
  };
} else {
  module.exports = httpLogger;
}

// Export the logger as well for use in other files
module.exports.logger = logger;
module.exports.httpLogger = httpLogger;

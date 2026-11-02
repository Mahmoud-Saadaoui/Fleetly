const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { httpLogger } = require('./middlewares/httpLogger');
const { requestId } = require('./middlewares/requestId');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { sanitizeRequest } = require('./middlewares/sanitizeRequest');

const app = express();

app.disable('x-powered-by');

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 0;
if (trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}

const normalizeOrigin = (origin) => origin?.trim().replace(/\/+$/, '');
const configuredOrigins = process.env.CLIENT_ALLOWED_ORIGINS
  ? process.env.CLIENT_ALLOWED_ORIGINS.split(',')
  : [process.env.CLIENT_DEVELOPMENT_DOMAIN, process.env.CLIENT_PRODUCTION_DOMAIN];
const allowedOrigins = [...new Set(configuredOrigins
  .map(normalizeOrigin)
  .filter(Boolean))];

app.use(helmet());
app.use(requestId);
app.use(httpLogger);
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeRequest);
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(normalizeOrigin(origin)));
  },
  // Authentication uses the Authorization header, not cookies.
  credentials: false
}));
app.use('/api', apiLimiter);

app.use('/api/users', require('./routes/userRoute'));
app.use('/api/admin/users', require('./routes/userAdminRoute'));
app.use('/api/vehicles', require('./routes/vehicleRoute'));
app.use('/api/admin/vehicles', require('./routes/vehicleAdminRoute'));
app.use('/api/bookings', require('./routes/bookingRoute'));
app.use('/api/agent/bookings', require('./routes/bookingAgentRoute'));
app.use('/api/branches', require('./routes/branchRoute'));
app.use('/api/analytics', require('./routes/analyticsRoute'));
app.use('/api/auth', require('./routes/authSocialRoute'));
app.use('/health', require('./routes/healthRoute'));

const { notFound, errorHandler } = require('./middlewares/errorHandler');
app.use(notFound);
app.use(errorHandler);

module.exports = app;

// Separate readiness route as per T050
app.use('/ready', require('./routes/readinessRoute'));

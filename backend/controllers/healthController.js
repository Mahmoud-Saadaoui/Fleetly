const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Liveness probe - checks if the process is alive (no external dependencies)
 */
exports.livenessCheck = (req, res) => {
  return res.status(200).json({
    status: 'alive'
  });
};

/**
 * Readiness probe - checks if the service is ready to accept traffic (depends on MongoDB)
 */
exports.readinessCheck = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not ready'
      });
    }

    // Ping database with timeout
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);

    return res.status(200).json({
      status: 'ready'
    });
  } catch (error) {
    logger.warn('Readiness check failed', { requestId: req.id });
    return res.status(503).json({
      status: 'not ready'
    });
  }
};

/**
 * Health check endpoint (legacy/combined)
 */
exports.healthCheck = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'unhealthy'
      });
    }

    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);

    return res.status(200).json({
      status: 'healthy'
    });
  } catch (error) {
    logger.warn('Health check failed', { requestId: req.id });
    return res.status(503).json({
      status: 'unhealthy'
    });
  }
};

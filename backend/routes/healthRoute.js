const express = require('express');
const router = express.Router();
const {
  healthCheck,
  readinessCheck,
  livenessCheck
} = require('../controllers/healthController');

// Liveness probe (for Kubernetes/Docker) - process alive
router.get('/live', livenessCheck);

// Readiness probe (for Kubernetes/Docker) - ready to accept traffic (depends on MongoDB)
router.get('/ready', readinessCheck);

// Health check endpoint (combined)
router.get('/', healthCheck);

module.exports = router;

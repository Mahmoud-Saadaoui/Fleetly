const express = require('express');
const router = express.Router();
const { readinessCheck } = require('../controllers/healthController');

// Readiness probe
router.get('/', readinessCheck);

module.exports = router;

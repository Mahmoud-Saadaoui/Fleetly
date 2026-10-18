const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { getAgentBookings } = require('../controllers/bookingAgentController');

// Bookings visible to agents (filtered by branch)
router.get(
  '/',
  auth.check,
  authorize('agency_manager', 'admin'),
  getAgentBookings
);

module.exports = router;

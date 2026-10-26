const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const validate = require('../middlewares/validate');
const bookingRules = require('../validators/bookingValidator');
const { quoteBooking, createBooking, getMyBookings, updateBookingStatus } = require('../controllers/bookingController');

router.post('/quote', bookingRules.quote, validate, quoteBooking);
router.post('/', auth.check, authorize('user', 'admin', 'agency_manager'), bookingRules.create, validate, createBooking);
router.get('/mine', auth.check, authorize('user', 'admin', 'agency_manager'), getMyBookings);
router.patch('/:id/status', auth.check, authorize('admin', 'agency_manager'), updateBookingStatus);

module.exports = router;

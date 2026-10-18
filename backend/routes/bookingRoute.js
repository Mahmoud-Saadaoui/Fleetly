const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { quoteBooking, createBooking, getMyBookings, updateBookingStatus } = require('../controllers/bookingController');

router.post('/quote', quoteBooking);
router.post('/', auth.check, authorize('user', 'admin', 'agency_manager'), createBooking);
router.get('/mine', auth.check, authorize('user', 'admin', 'agency_manager'), getMyBookings);
router.patch('/:id/status', auth.check, authorize('admin', 'agency_manager'), updateBookingStatus);

module.exports = router;

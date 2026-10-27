const mongoose = require('mongoose');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { successResponse, createdResponse, notFoundResponse, badRequestResponse, conflictResponse, paginatedResponse, forbiddenResponse } = require('../utils/apiResponse');
const { parsePagination, getPaginationMeta } = require('../utils/pagination');
const { canTransition } = require('../utils/bookingStateMachine');
const { createBookingAtomic } = require('../services/bookingService');

const TAX_RATE = Number(process.env.RENTAL_TAX_RATE) || 0.2;

// Human-readable status wording, so the API never answers "is currently
// maintenance". Anything unknown falls back to the raw status string.
const STATUS_TEXT = {
  reserved: 'reserved',
  rented: 'rented',
  maintenance: 'in maintenance',
  retired: 'retired'
};
const statusText = (status) => STATUS_TEXT[status] || status;

const parseDates = (startAt, endAt) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const now = new Date();
  if (start < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return null;
  const rentalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return { startAt: start, endAt: end, rentalDays };
};

const findConflict = (vehicleId, dates, excludeId) => {
  const filter = {
    vehicle: vehicleId,
    status: { $in: Booking.activeStatuses },
    startAt: { $lt: dates.endAt },
    endAt: { $gt: dates.startAt }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Booking.exists(filter);
};

const buildPricing = (vehicle, rentalDays) => {
  const subtotalCents = vehicle.dailyRateCents * rentalDays;
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return {
    dailyRateCents: vehicle.dailyRateCents,
    rentalDays,
    subtotalCents,
    extrasCents: 0,
    discountCents: 0,
    taxCents,
    totalCents: subtotalCents + taxCents,
    currency: vehicle.currency
  };
};

const quoteBooking = asyncHandler(async (req, res) => {
  const { vehicleId, startAt, endAt } = req.body;
  if (!mongoose.isValidObjectId(vehicleId)) return badRequestResponse(res, 'Invalid vehicle id');
  const dates = parseDates(startAt, endAt);
  if (!dates) return badRequestResponse(res, 'Invalid booking dates');
  const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false, status: { $ne: 'retired' } }).lean();
  if (!vehicle) return notFoundResponse(res, 'Vehicle');
  // Two different problems deserve two different messages: the car itself may be
  // reserved/rented/in maintenance, or only the requested dates may be taken.
  if (vehicle.status !== 'available') return conflictResponse(res, `Vehicle is ${statusText(vehicle.status)} and cannot be booked`);
  if (await findConflict(vehicleId, dates)) return conflictResponse(res, 'Vehicle is already booked for these dates');
  return successResponse(res, { vehicleId, startAt: dates.startAt, endAt: dates.endAt, pricing: buildPricing(vehicle, dates.rentalDays) }, 'Quote created successfully');
});

const createBooking = asyncHandler(async (req, res) => {
  const { vehicleId, startAt, endAt, pickupBranch, returnBranch, idempotencyKey, notes } = req.body;
  if (!mongoose.isValidObjectId(vehicleId)) return badRequestResponse(res, 'Invalid vehicle id');
  const dates = parseDates(startAt, endAt);
  if (!dates) return badRequestResponse(res, 'Invalid booking dates');

  try {
    const result = await createBookingAtomic({
      customerId: req.userId,
      vehicleId,
      dates,
      pickupBranch,
      returnBranch,
      idempotencyKey,
      notes
    });
    if (result.created) {
      return createdResponse(res, result.booking, 'Reservation request submitted for confirmation');
    }
    return successResponse(res, result.booking, 'Reservation request already exists');
  } catch (error) {
    if (error.statusCode === 400) {
      if (error.message === 'Invalid pickup branch') return badRequestResponse(res, 'Invalid pickup branch');
      if (error.message === 'Pickup branch is not active') return badRequestResponse(res, 'Pickup branch is not active');
      if (error.message === 'Invalid return branch') return badRequestResponse(res, 'Invalid return branch');
      if (error.message === 'Return branch is not active') return badRequestResponse(res, 'Return branch is not active');
      return badRequestResponse(res, error.message);
    }
    if (error.statusCode === 404) return notFoundResponse(res, 'Vehicle');
    if (error.statusCode === 409) return conflictResponse(res, error.message);
    throw error;
  }
});

const getMyBookings = asyncHandler(async (req, res) => {
  // Pagination: extract page, limit, skip from query string
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { customer: req.userId };
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }

  // Fetch paginated bookings + total in parallel
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate('vehicle').populate('pickupBranch').populate('returnBranch').sort({ startAt: -1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter)
  ]);

  return paginatedResponse(res, bookings, getPaginationMeta(page, limit, total), 'Bookings retrieved successfully');
});

const getMyBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('vehicle').populate('pickupBranch').populate('returnBranch').lean();
  if (!booking) return notFoundResponse(res, 'Booking');
  if (String(booking.customer) !== String(req.userId)) {
    return forbiddenResponse(res, 'You can only view your own booking');
  }
  return successResponse(res, booking, 'Booking retrieved successfully');
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const allowedStatuses = ['confirmed', 'cancelled', 'active', 'completed', 'no_show'];
  if (!allowedStatuses.includes(req.body.status)) return badRequestResponse(res, 'Invalid booking status');
  const booking = await Booking.findById(req.params.id).populate('vehicle', 'branch');
  if (!booking) return notFoundResponse(res, 'Booking');
  const branchIds = req.currentUser.branchIds || [];
  if (req.currentUser.role !== 'admin' && (!booking.vehicle?.branch || !branchIds.some((id) => String(id) === String(booking.vehicle.branch)))) {
    return conflictResponse(res, 'Booking is outside your branch scope');
  }
  if (booking.expiresAt && booking.status === 'pending_payment' && booking.expiresAt < new Date() && req.body.status !== 'cancelled') {
    return badRequestResponse(res, 'Reservation request has expired');
  }
  if (!canTransition(booking.status, req.body.status)) {
    return badRequestResponse(res, `Invalid booking status transition from ${booking.status} to ${req.body.status}`);
  }
  booking.status = req.body.status;
  if (req.body.status === 'cancelled') {
    booking.cancelledAt = new Date();
    booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : 'failed';
  }
  if (req.body.status === 'confirmed') {
    booking.paymentStatus = 'authorized';
  }
  if (req.body.status === 'active') {
    booking.paymentStatus = 'paid';
  }
  await booking.save();
  return successResponse(res, booking, 'Booking status updated successfully');
});

const cancelMyBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return notFoundResponse(res, 'Booking');
  if (String(booking.customer) !== String(req.userId)) {
    return forbiddenResponse(res, 'You can only cancel your own booking');
  }
  if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
    return badRequestResponse(res, 'Booking cannot be cancelled in its current state');
  }
  // Free cancellation allowed for requests not yet confirmed/active; confirmed/active follow documented window
  if (booking.status === 'active') {
    return badRequestResponse(res, 'Active bookings cannot be cancelled online');
  }
  if (booking.status === 'confirmed') {
    // Documented window: at least 24h before start
    if (booking.startAt && booking.startAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      return badRequestResponse(res, 'Cancellation window has expired');
    }
  }
  if (!canTransition(booking.status, 'cancelled')) {
    return badRequestResponse(res, 'Booking cannot be cancelled');
  }
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = req.body?.reason?.trim() || 'Cancelled by customer';
  booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : 'failed';
  await booking.save();
  return successResponse(res, booking, 'Booking cancelled successfully');
});

module.exports = { quoteBooking, createBooking, getMyBookings, getMyBookingById, updateBookingStatus, cancelMyBooking };

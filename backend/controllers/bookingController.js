const mongoose = require('mongoose');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { successResponse, createdResponse, notFoundResponse, badRequestResponse, conflictResponse, paginatedResponse } = require('../utils/apiResponse');
const { parsePagination, getPaginationMeta } = require('../utils/pagination');

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

  if (idempotencyKey) {
    const existing = await Booking.findOne({ customer: req.userId, idempotencyKey }).populate('vehicle');
    if (existing) return successResponse(res, existing, 'Booking already exists');
  }

  const Branch = require('../models/branch');
  if (pickupBranch) {
    if (!mongoose.isValidObjectId(pickupBranch)) return badRequestResponse(res, 'Invalid pickup branch');
    const pb = await Branch.findById(pickupBranch).select('isActive');
    if (!pb) return badRequestResponse(res, 'Invalid pickup branch');
    if (pb.isActive === false) return badRequestResponse(res, 'Pickup branch is not active');
  }
  if (returnBranch) {
    if (!mongoose.isValidObjectId(returnBranch)) return badRequestResponse(res, 'Invalid return branch');
    const rb = await Branch.findById(returnBranch).select('isActive');
    if (!rb) return badRequestResponse(res, 'Invalid return branch');
    if (rb.isActive === false) return badRequestResponse(res, 'Return branch is not active');
  }

  const vehicleQuery = Vehicle.findOne({ _id: vehicleId, isDeleted: false, status: { $ne: 'retired' } });
  if (typeof vehicleQuery.populate === 'function') {
    vehicleQuery.populate('branch');
  }
  const vehicle = typeof vehicleQuery.lean === 'function' ? await vehicleQuery.lean() : await vehicleQuery;
  if (!vehicle) return notFoundResponse(res, 'Vehicle');
  if (vehicle.status !== 'available') return conflictResponse(res, `Vehicle is ${statusText(vehicle.status)} and cannot be booked`);
  if (await findConflict(vehicleId, dates)) return conflictResponse(res, 'Vehicle is already booked for these dates');

  const booking = await Booking.create({
    customer: req.userId,
    vehicle: vehicle._id,
    pickupBranch,
    returnBranch,
    startAt: dates.startAt,
    endAt: dates.endAt,
    pricing: buildPricing(vehicle, dates.rentalDays),
    idempotencyKey,
    notes,
    status: 'pending_payment'
  });
  return createdResponse(res, await booking.populate('vehicle'), 'Booking created successfully');
});

const getMyBookings = asyncHandler(async (req, res) => {
  // Pagination: extract page, limit, skip from query string
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { customer: req.userId };

  // Fetch paginated bookings + total in parallel
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate('vehicle').sort({ startAt: -1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter)
  ]);

  return paginatedResponse(res, bookings, getPaginationMeta(page, limit, total), 'Bookings retrieved successfully');
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
  booking.status = req.body.status;
  if (req.body.status === 'cancelled') booking.cancelledAt = new Date();
  await booking.save();
  return successResponse(res, booking, 'Booking status updated successfully');
});

module.exports = { quoteBooking, createBooking, getMyBookings, updateBookingStatus };

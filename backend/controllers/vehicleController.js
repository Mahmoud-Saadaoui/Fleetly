const mongoose = require('mongoose');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { successResponse, createdResponse, notFoundResponse, badRequestResponse, paginatedResponse } = require('../utils/apiResponse');
const { parsePagination, getPaginationMeta } = require('../utils/pagination');

const parseWindow = (from, to) => {
  if (!from && !to) return null;
  const startAt = new Date(from);
  const endAt = new Date(to);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) return null;
  return { startAt, endAt };
};

// Free-text search on make/model. The user input is escaped so it can neither
// inject regex syntax nor trigger catastrophic backtracking.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getVehicles = asyncHandler(async (req, res) => {
  const { category, branch, from, to, status, search } = req.query;
  const window = parseWindow(from, to);
  if ((from || to) && !window) return badRequestResponse(res, 'Invalid availability window');

  // Pagination: extract page, limit, skip from query string
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { isDeleted: false };
  if (category) filter.category = category;
  if (branch && mongoose.isValidObjectId(branch)) filter.branch = branch;
  if (status) filter.status = status;
  else filter.status = { $ne: 'retired' };

  if (typeof search === 'string') {
    const term = search.trim().slice(0, 60);
    if (term) {
      const regex = new RegExp(escapeRegex(term), 'i');
      filter.$or = [{ make: regex }, { model: regex }];
    }
  }

  // Fetch paginated vehicles + total in parallel
  const vehiclesQuery = Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  if (typeof vehiclesQuery.select === 'function') {
    vehiclesQuery.select('-vin -registrationNumber');
  }
  const [vehicles, total] = await Promise.all([
    typeof vehiclesQuery.lean === 'function' ? vehiclesQuery.lean() : vehiclesQuery,
    Vehicle.countDocuments(filter)
  ]);

  // If no date window, return directly with pagination
  if (!window || vehicles.length === 0) {
    return paginatedResponse(res, vehicles, getPaginationMeta(page, limit, total), 'Vehicles retrieved successfully');
  }

  // With date window: check conflicting bookings
  const reservedVehicleIds = await Booking.distinct('vehicle', {
    vehicle: { $in: vehicles.map((vehicle) => vehicle._id) },
    status: { $in: Booking.activeStatuses },
    startAt: { $lt: window.endAt },
    endAt: { $gt: window.startAt }
  });
  const reserved = new Set(reservedVehicleIds.map(String));
  const data = vehicles.map((vehicle) => ({
    ...vehicle,
    available: vehicle.status === 'available' && !reserved.has(String(vehicle._id))
  }));
  return paginatedResponse(res, data, getPaginationMeta(page, limit, total), 'Vehicles retrieved successfully');
});

/**
 * Get a single vehicle by ID (public)
 * GET /api/vehicles/:id
 */
const getVehicleById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFoundResponse(res, 'Vehicle');

  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    isDeleted: false,
    status: { $ne: 'retired' }
  }).populate('branch').lean();

  if (!vehicle) return notFoundResponse(res, 'Vehicle');
  return successResponse(res, vehicle, 'Vehicle retrieved successfully');
});

/**
 * Get the active booked date ranges of a vehicle (public)
 * GET /api/vehicles/:id/availability
 *
 * Only date ranges are exposed (never customer data) so anonymous visitors can
 * pick free dates on the public detail page.
 */
const getVehicleAvailability = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badRequestResponse(res, 'Invalid vehicle id');

  const bookedRanges = await Booking.find({
    vehicle: req.params.id,
    status: { $in: Booking.activeStatuses },
    endAt: { $gte: new Date() }
  })
    .select('startAt endAt -_id')
    .sort({ startAt: 1 })
    .lean();

  return successResponse(
    res,
    { vehicleId: req.params.id, bookedRanges },
    'Vehicle availability retrieved successfully'
  );
});

const createVehicle = asyncHandler(async (req, res) => {
  const branchIds = req.currentUser.branchIds || [];
  if (req.currentUser.role !== 'admin' && (!req.body.branch || !branchIds.some((id) => String(id) === String(req.body.branch)))) {
    return badRequestResponse(res, 'Vehicle branch is outside your scope');
  }
  // Drop empty optional fields: sending branch: '' makes Mongoose fail to cast
  // it to an ObjectId, and an empty vin would collide on the unique index.
  const payload = { ...req.body };
  ['branch', 'vin', 'location'].forEach((field) => {
    if (payload[field] === '' || payload[field] === null) delete payload[field];
  });

  const vehicle = await Vehicle.create({ ...payload, createdBy: req.userId });
  return createdResponse(res, vehicle, 'Vehicle created successfully');
});

const updateVehicleStatus = asyncHandler(async (req, res) => {
  const allowedStatuses = ['available', 'reserved', 'rented', 'maintenance', 'retired'];
  if (!allowedStatuses.includes(req.body.status)) return badRequestResponse(res, 'Invalid vehicle status');
  const filter = { _id: req.params.id, isDeleted: false };
  if (req.currentUser.role !== 'admin') filter.branch = { $in: req.currentUser.branchIds || [] };
  const vehicle = await Vehicle.findOneAndUpdate(
    filter,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!vehicle) return notFoundResponse(res, 'Vehicle');
  return successResponse(res, vehicle, 'Vehicle status updated successfully');
});

module.exports = { getVehicles, getVehicleById, getVehicleAvailability, createVehicle, updateVehicleStatus };

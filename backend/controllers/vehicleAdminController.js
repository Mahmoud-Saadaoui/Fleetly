const mongoose = require('mongoose');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const Branch = require('../models/branch');
const { asyncHandler } = require('../middlewares/asyncHandler');
const {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse
} = require('../utils/apiResponse');

/**
 * Update a vehicle (partial PATCH)
 * PATCH /api/admin/vehicles/:id
 */
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, isDeleted: false });
  if (!vehicle) {
    return notFoundResponse(res, 'Vehicle');
  }

  // Check vehicle is within user's scope (except admin)
  if (req.currentUser.role !== 'admin') {
    const branchIds = req.currentUser.branchIds || [];
    if (!vehicle.branch || !branchIds.some((id) => String(id) === String(vehicle.branch))) {
      return conflictResponse(res, 'Vehicle is outside your branch scope');
    }
  }

  const {
    make, model, category, registrationNumber, vin, branch,
    location, dailyRateCents, currency, seats, transmission,
    fuelType, mileage, images, status, ownershipCostCentsPerDay, maintenanceCostCents
  } = req.body;

  // Check registrationNumber uniqueness if changed
  if (registrationNumber && registrationNumber !== vehicle.registrationNumber) {
    const existing = await Vehicle.findOne({
      registrationNumber: registrationNumber.toUpperCase(),
      _id: { $ne: vehicle._id },
      isDeleted: false
    });
    if (existing) {
      return conflictResponse(res, 'Registration number already exists');
    }
    vehicle.registrationNumber = registrationNumber.toUpperCase();
  }

  // Check VIN uniqueness if changed
  if (vin && vin !== vehicle.vin) {
    const existing = await Vehicle.findOne({ vin: vin.toUpperCase(), _id: { $ne: vehicle._id } });
    if (existing) {
      return conflictResponse(res, 'VIN already exists');
    }
    vehicle.vin = vin.toUpperCase();
  }

  // Check branch exists if provided
  if (branch) {
    if (!mongoose.isValidObjectId(branch)) {
      return badRequestResponse(res, 'Invalid branch ID');
    }
    if (req.currentUser.role !== 'admin') {
      const branchIds = req.currentUser.branchIds || [];
      if (!branchIds.some((id) => String(id) === String(branch))) {
        return badRequestResponse(res, 'Vehicle branch is outside your scope');
      }
    }
    const branchExists = await Branch.findById(branch);
    if (!branchExists) {
      return badRequestResponse(res, 'Invalid branch');
    }
    vehicle.branch = branch;
  }

  // Update provided fields
  if (make !== undefined) vehicle.make = make;
  if (model !== undefined) vehicle.model = model;
  if (category !== undefined) vehicle.category = category;
  if (location !== undefined) vehicle.location = location;
  if (dailyRateCents !== undefined) vehicle.dailyRateCents = dailyRateCents;
  if (currency !== undefined) vehicle.currency = currency.toUpperCase();
  if (seats !== undefined) vehicle.seats = seats;
  if (transmission !== undefined) vehicle.transmission = transmission;
  if (fuelType !== undefined) vehicle.fuelType = fuelType;
  if (mileage !== undefined) vehicle.mileage = mileage;
  if (images !== undefined) vehicle.images = images;
  if (status !== undefined) vehicle.status = status;
  if (ownershipCostCentsPerDay !== undefined) vehicle.ownershipCostCentsPerDay = ownershipCostCentsPerDay;
  if (maintenanceCostCents !== undefined) vehicle.maintenanceCostCents = maintenanceCostCents;

  await vehicle.save();

  const updatedVehicle = await Vehicle.findById(vehicle._id)
    .populate('branch', 'name code')
    .lean();

  return successResponse(res, updatedVehicle, 'Vehicle updated successfully');
});

/**
 * Delete a vehicle (soft delete)
 * DELETE /api/admin/vehicles/:id
 */
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, isDeleted: false });
  if (!vehicle) {
    return notFoundResponse(res, 'Vehicle');
  }

  // Check vehicle is within user's scope (except admin)
  if (req.currentUser.role !== 'admin') {
    const branchIds = req.currentUser.branchIds || [];
    if (!vehicle.branch || !branchIds.some((id) => String(id) === String(vehicle.branch))) {
      return conflictResponse(res, 'Vehicle is outside your branch scope');
    }
  }

  // Check no active bookings exist
  const activeBooking = await Booking.findOne({
    vehicle: vehicle._id,
    status: { $in: Booking.activeStatuses }
  });
  if (activeBooking) {
    return conflictResponse(res, 'Cannot delete: active booking exists');
  }

  // Soft delete
  vehicle.isDeleted = true;
  await vehicle.save();

  return successResponse(res, null, 'Vehicle deleted successfully');
});

module.exports = {
  updateVehicle,
  deleteVehicle
};

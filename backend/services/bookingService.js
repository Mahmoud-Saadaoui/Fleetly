const mongoose = require('mongoose');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const Branch = require('../models/branch');

const TAX_RATE = Number(process.env.RENTAL_TAX_RATE) || 0.2;

const STATUS_TEXT = {
  reserved: 'reserved',
  rented: 'rented',
  maintenance: 'in maintenance',
  retired: 'retired'
};
const statusText = (status) => STATUS_TEXT[status] || status;

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

const findConflict = async (vehicleId, dates, excludeId, session) => {
  const filter = {
    vehicle: vehicleId,
    status: { $in: Booking.activeStatuses },
    startAt: { $lt: dates.endAt },
    endAt: { $gt: dates.startAt }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const result = Booking.exists(filter);
  if (session && result && typeof result.session === 'function') {
    result.session(session);
    return result;
  }
  return result;
};

const createBookingAtomic = async ({
  customerId,
  vehicleId,
  dates,
  pickupBranch,
  returnBranch,
  idempotencyKey,
  notes
}) => {
  if (idempotencyKey) {
    const existingQuery = Booking.findOne({ customer: customerId, idempotencyKey }).populate('vehicle');
    const existing = await existingQuery;
    if (existing) return { booking: existing, created: false };
  }

  if (pickupBranch) {
    if (!mongoose.isValidObjectId(pickupBranch)) {
      const err = new Error('Invalid pickup branch');
      err.statusCode = 400;
      throw err;
    }
    const pbQuery = Branch.findById(pickupBranch).select('isActive');
    const pb = await pbQuery;
    if (!pb) {
      const err = new Error('Invalid pickup branch');
      err.statusCode = 400;
      throw err;
    }
    if (pb.isActive === false) {
      const err = new Error('Pickup branch is not active');
      err.statusCode = 400;
      throw err;
    }
  }
  if (returnBranch) {
    if (!mongoose.isValidObjectId(returnBranch)) {
      const err = new Error('Invalid return branch');
      err.statusCode = 400;
      throw err;
    }
    const rbQuery = Branch.findById(returnBranch).select('isActive');
    const rb = await rbQuery;
    if (!rb) {
      const err = new Error('Invalid return branch');
      err.statusCode = 400;
      throw err;
    }
    if (rb.isActive === false) {
      const err = new Error('Return branch is not active');
      err.statusCode = 400;
      throw err;
    }
  }

  const vehicleQuery = Vehicle.findOne({ _id: vehicleId, isDeleted: false, status: { $ne: 'retired' } });
  if (typeof vehicleQuery.populate === 'function') {
    vehicleQuery.populate('branch');
  }
  const vehicle = typeof vehicleQuery.lean === 'function' ? await vehicleQuery.lean() : await vehicleQuery;
  if (!vehicle) {
    const err = new Error('Vehicle');
    err.statusCode = 404;
    throw err;
  }
  if (vehicle.status !== 'available') {
    const err = new Error(`Vehicle is ${statusText(vehicle.status)} and cannot be booked`);
    err.statusCode = 409;
    throw err;
  }
  if (await findConflict(vehicleId, dates)) {
    const err = new Error('Vehicle is already booked for these dates');
    err.statusCode = 409;
    throw err;
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    let booking;
    await session.withTransaction(async () => {
      if (await findConflict(vehicleId, dates, null, session)) {
        const err = new Error('Vehicle is already booked for these dates');
        err.statusCode = 409;
        throw err;
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const created = await Booking.create([{
        customer: customerId,
        vehicle: vehicle._id,
        pickupBranch,
        returnBranch,
        startAt: dates.startAt,
        endAt: dates.endAt,
        pricing: buildPricing(vehicle, dates.rentalDays),
        idempotencyKey,
        notes,
        status: 'pending_payment',
        paymentStatus: 'pending',
        expiresAt
      }], { session });
      booking = created[0];
    });
    if (booking) {
      await booking.populate('vehicle');
      return { booking, created: true };
    }
  } catch (error) {
    if (error.code === 11000) {
      if (idempotencyKey) {
        const existingQuery = Booking.findOne({ customer: customerId, idempotencyKey }).populate('vehicle');
        const existing = await existingQuery;
        if (existing) return { booking: existing, created: false };
      }
      const err = new Error('Vehicle is already booked for these dates');
      err.statusCode = 409;
      throw err;
    }
    if (error.statusCode) throw error;
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const created = await Booking.create({
    customer: customerId,
    vehicle: vehicle._id,
    pickupBranch,
    returnBranch,
    startAt: dates.startAt,
    endAt: dates.endAt,
    pricing: buildPricing(vehicle, dates.rentalDays),
    idempotencyKey,
    notes,
    status: 'pending_payment',
    paymentStatus: 'pending',
    expiresAt
  });
  return { booking: await created.populate('vehicle'), created: true };
};

module.exports = { createBookingAtomic };

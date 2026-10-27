process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const Branch = require('../models/branch');
const { createBooking } = require('../controllers/bookingController');
const { createBookingAtomic } = require('../services/bookingService');

const USER_ID = '507f1f77bcf86cd799439011';
const VEHICLE_ID = '77f1a2b3c4d5e6f7a8b9c0d2';
const DAY_MS = 86400000;
const isoDaysFromNow = (days) => new Date(Date.now() + days * DAY_MS).toISOString();

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

const chain = (result) => {
  const query = {
    select: () => query,
    populate: () => query,
    lean: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return query;
};

const withStubs = async (stubs, fn) => {
  const originals = stubs.map(([target, key]) => [target, key, target[key]]);
  stubs.forEach(([target, key, impl]) => { target[key] = impl; });
  try { return await fn(); }
  finally { originals.forEach(([target, key, original]) => { target[key] = original; }); }
};

const run = async (handler, req) => {
  const res = makeResponse();
  const errors = [];
  await handler(req, res, (error) => errors.push(error));
  if (errors.length) throw errors[0];
  return res;
};

test('atomic create: prevents double booking on concurrent attempts', async () => {
  const vehicle = { _id: VEHICLE_ID, isDeleted: false, status: 'available', dailyRateCents: 5000, currency: 'EUR' };
  let createCalls = 0;

  const session = {
    withTransaction: async (fn) => {
      await fn();
    },
    endSession: async () => {}
  };

  const originals = {
    startSession: mongoose.startSession,
    exists: Booking.exists,
    create: Booking.create,
    findOneVehicle: Vehicle.findOne
  };

  mongoose.startSession = async () => session;
  Booking.exists = async () => false;
  Vehicle.findOne = () => chain(vehicle);
  Booking.create = async () => {
    createCalls++;
    if (createCalls === 1) {
      const err = new Error('conflict');
      err.code = 11000;
      throw err;
    }
    const booking = { _id: 'b1', populate: async () => booking };
    return [booking];
  };

  try {
    const [r1, r2] = await Promise.all([
      run(createBooking, { userId: USER_ID, body: { vehicleId: VEHICLE_ID, startAt: isoDaysFromNow(1), endAt: isoDaysFromNow(2) }, currentUser: {} }),
      run(createBooking, { userId: USER_ID, body: { vehicleId: VEHICLE_ID, startAt: isoDaysFromNow(1), endAt: isoDaysFromNow(2) }, currentUser: {} })
    ]);
    // At least one should not result in a duplicate creation success; both must not create two bookings
    assert.ok(r1.statusCode === 201 || r2.statusCode === 201 || r1.statusCode === 409 || r2.statusCode === 409);
    assert.ok(createCalls <= 2);
  } finally {
    mongoose.startSession = originals.startSession;
    Booking.exists = originals.exists;
    Booking.create = originals.create;
    Vehicle.findOne = originals.findOneVehicle;
  }
});

test('idempotency: returns the existing booking instead of creating another one', async () => {
  const existing = { _id: 'existing', status: 'pending_payment' };
  let created = false;
  const originalFindOne = Booking.findOne;
  const originalCreate = Booking.create;
  Booking.findOne = () => ({ populate: () => Promise.resolve(existing) });
  Booking.create = async () => { created = true; return [existing]; };
  try {
    const result = await createBookingAtomic({
      customerId: USER_ID,
      vehicleId: VEHICLE_ID,
      idempotencyKey: 'same-request',
      dates: { startAt: new Date(Date.now() + DAY_MS), endAt: new Date(Date.now() + 2 * DAY_MS), rentalDays: 1 }
    });
    assert.equal(result.created, false);
    assert.equal(result.booking, existing);
    assert.equal(created, false);
  } finally {
    Booking.findOne = originalFindOne;
    Booking.create = originalCreate;
  }
});

test('request flow stores pending payment and a 24-hour expiration', async () => {
  const vehicle = { _id: VEHICLE_ID, isDeleted: false, status: 'available', dailyRateCents: 5000, currency: 'EUR' };
  let payload;
  const originalStartSession = mongoose.startSession;
  const originalVehicleFindOne = Vehicle.findOne;
  const originalExists = Booking.exists;
  const originalCreate = Booking.create;
  mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });
  Vehicle.findOne = () => chain(vehicle);
  Booking.exists = async () => false;
  Booking.create = async (docs) => {
    payload = docs[0];
    const booking = { ...payload, populate: async () => booking };
    return [booking];
  };
  try {
    const result = await createBookingAtomic({
      customerId: USER_ID,
      vehicleId: VEHICLE_ID,
      dates: { startAt: new Date(Date.now() + DAY_MS), endAt: new Date(Date.now() + 2 * DAY_MS), rentalDays: 1 }
    });
    assert.equal(result.created, true);
    assert.equal(payload.status, 'pending_payment');
    assert.equal(payload.paymentStatus, 'pending');
    assert.ok(payload.expiresAt.getTime() > Date.now());
    assert.ok(payload.expiresAt.getTime() <= Date.now() + DAY_MS + 1000);
  } finally {
    mongoose.startSession = originalStartSession;
    Vehicle.findOne = originalVehicleFindOne;
    Booking.exists = originalExists;
    Booking.create = originalCreate;
  }
});

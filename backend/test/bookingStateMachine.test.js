process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const Booking = require('../models/booking');
const Vehicle = require('../models/vehicle');
const { updateBookingStatus, cancelMyBooking } = require('../controllers/bookingController');
const { canTransition, getAllowedTransitions } = require('../utils/bookingStateMachine');

const BOOKING_ID = '88f1a2b3c4d5e6f7a8b9c0d3';
const BRANCH_ID = '66f1a2b3c4d5e6f7a8b9c0d1';
const USER_ID = '507f1f77bcf86cd799439011';

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

const chain = (result) => {
  const query = {
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

test('state machine: pending_payment -> confirmed and cancelled allowed', () => {
  assert.equal(canTransition('pending_payment', 'confirmed'), true);
  assert.equal(canTransition('pending_payment', 'cancelled'), true);
  assert.equal(canTransition('pending_payment', 'active'), false);
});

test('state machine: confirmed -> active|cancelled|no_show allowed', () => {
  assert.equal(canTransition('confirmed', 'active'), true);
  assert.equal(canTransition('confirmed', 'cancelled'), true);
  assert.equal(canTransition('confirmed', 'no_show'), true);
  assert.equal(canTransition('confirmed', 'completed'), false);
});

test('state machine: active -> completed|cancelled allowed, terminal immutable', () => {
  assert.equal(canTransition('active', 'completed'), true);
  assert.equal(canTransition('active', 'cancelled'), true);
  assert.equal(canTransition('active', 'no_show'), false);
  assert.equal(canTransition('completed', 'cancelled'), false);
  assert.equal(canTransition('cancelled', 'confirmed'), false);
  assert.equal(canTransition('no_show', 'active'), false);
});

test('state machine: getAllowedTransitions returns empty for terminal states', () => {
  assert.deepEqual(getAllowedTransitions('completed'), []);
  assert.deepEqual(getAllowedTransitions('cancelled'), []);
});

test('updateBookingStatus rejects invalid transition', async () => {
  const booking = { status: 'completed', vehicle: { branch: BRANCH_ID } };
  const res = await withStubs([
    [Booking, 'findById', () => ({ populate: () => booking })]
  ], () => run(updateBookingStatus, {
    params: { id: BOOKING_ID },
    body: { status: 'cancelled' },
    currentUser: { role: 'admin', branchIds: [BRANCH_ID] }
  }));
  assert.equal(res.statusCode, 400);
});

test('updateBookingStatus allows valid transition pending_payment -> confirmed', async () => {
  const booking = { status: 'pending_payment', vehicle: { branch: BRANCH_ID }, save: async () => {} };
  const res = await withStubs([
    [Booking, 'findById', () => ({ populate: () => booking })]
  ], () => run(updateBookingStatus, {
    params: { id: BOOKING_ID },
    body: { status: 'confirmed' },
    currentUser: { role: 'admin', branchIds: [BRANCH_ID] }
  }));
  assert.equal(res.statusCode, 200);
});

test('updateBookingStatus sets cancelledAt on cancellation', async () => {
  const booking = { status: 'confirmed', vehicle: { branch: BRANCH_ID }, save: async () => {} };
  const res = await withStubs([
    [Booking, 'findById', () => ({ populate: () => booking })]
  ], () => run(updateBookingStatus, {
    params: { id: BOOKING_ID },
    body: { status: 'cancelled' },
    currentUser: { role: 'admin', branchIds: [BRANCH_ID] }
  }));
  assert.equal(res.statusCode, 200);
  assert.ok(booking.cancelledAt instanceof Date);
});

test('customer can cancel their own pending request with a reason', async () => {
  const booking = {
    customer: USER_ID,
    status: 'pending_payment',
    paymentStatus: 'pending',
    save: async () => {}
  };
  const res = await withStubs([
    [Booking, 'findById', async () => booking]
  ], () => run(cancelMyBooking, {
    params: { id: BOOKING_ID },
    userId: USER_ID,
    body: { reason: 'Changed plans' }
  }));
  assert.equal(res.statusCode, 200);
  assert.equal(booking.status, 'cancelled');
  assert.equal(booking.cancellationReason, 'Changed plans');
  assert.ok(booking.cancelledAt instanceof Date);
});

test('customer cannot cancel another customer booking', async () => {
  const booking = { customer: '507f1f77bcf86cd799439012', status: 'pending_payment' };
  const res = await withStubs([
    [Booking, 'findById', async () => booking]
  ], () => run(cancelMyBooking, {
    params: { id: BOOKING_ID },
    userId: USER_ID,
    body: {}
  }));
  assert.equal(res.statusCode, 403);
});

test('customer cannot cancel a completed booking', async () => {
  const booking = { customer: USER_ID, status: 'completed' };
  const res = await withStubs([
    [Booking, 'findById', async () => booking]
  ], () => run(cancelMyBooking, {
    params: { id: BOOKING_ID },
    userId: USER_ID,
    body: {}
  }));
  assert.equal(res.statusCode, 400);
});

test('customer cannot cancel a confirmed booking inside the 24-hour window', async () => {
  const booking = {
    customer: USER_ID,
    status: 'confirmed',
    startAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
  };
  const res = await withStubs([
    [Booking, 'findById', async () => booking]
  ], () => run(cancelMyBooking, {
    params: { id: BOOKING_ID },
    userId: USER_ID,
    body: {}
  }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Cancellation window has expired');
});

test('expired pending request cannot be confirmed', async () => {
  const booking = {
    status: 'pending_payment',
    expiresAt: new Date(Date.now() - 1000),
    vehicle: { branch: BRANCH_ID },
    save: async () => {}
  };
  const res = await withStubs([
    [Booking, 'findById', () => ({ populate: () => booking })]
  ], () => run(updateBookingStatus, {
    params: { id: BOOKING_ID },
    body: { status: 'confirmed' },
    currentUser: { role: 'admin', branchIds: [BRANCH_ID] }
  }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Reservation request has expired');
});

test('confirming and activating a booking update payment status', async () => {
  const booking = {
    status: 'pending_payment',
    paymentStatus: 'pending',
    vehicle: { branch: BRANCH_ID },
    save: async () => {}
  };
  const findById = () => ({ populate: () => booking });
  const originalFindById = Booking.findById;
  Booking.findById = findById;
  try {
    let res = await run(updateBookingStatus, {
      params: { id: BOOKING_ID }, body: { status: 'confirmed' },
      currentUser: { role: 'admin', branchIds: [BRANCH_ID] }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(booking.paymentStatus, 'authorized');
    res = await run(updateBookingStatus, {
      params: { id: BOOKING_ID }, body: { status: 'active' },
      currentUser: { role: 'admin', branchIds: [BRANCH_ID] }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(booking.paymentStatus, 'paid');
  } finally {
    Booking.findById = originalFindById;
  }
});

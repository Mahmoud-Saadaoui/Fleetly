process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');

const Booking = require('../models/booking');
const Branch = require('../models/branch');
const Vehicle = require('../models/vehicle');
const bookingRules = require('../validators/bookingValidator');
const { createBooking } = require('../controllers/bookingController');
const { getAgentBookings } = require('../controllers/bookingAgentController');

const USER_ID = '507f1f77bcf86cd799439011';
const VEHICLE_ID = '77f1a2b3c4d5e6f7a8b9c0d2';
const OWN_BRANCH = '66f1a2b3c4d5e6f7a8b9c0d1';
const FOREIGN_BRANCH = '66f1a2b3c4d5e6f7a8b9c0d2';
const DAY_MS = 86400000;

const isoDaysFromNow = (days) => new Date(Date.now() + days * DAY_MS).toISOString();

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const chain = (result) => {
  const query = {
    select: () => query,
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    lean: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return query;
};

const withStubs = async (stubs, fn) => {
  const originals = stubs.map(([target, key]) => [target, key, target[key]]);
  stubs.forEach(([target, key, impl]) => {
    target[key] = impl;
  });
  try {
    return await fn();
  } finally {
    originals.forEach(([target, key, original]) => {
      target[key] = original;
    });
  }
};

const run = async (handler, req) => {
  const res = makeResponse();
  const errors = [];
  await handler(req, res, (error) => errors.push(error));
  if (errors.length) throw errors[0];
  return res;
};

const runRules = async (rules, body) => {
  const req = { body };
  for (const rule of rules) await rule.run(req);
  return validationResult(req).array().map((error) => error.path);
};

const validBody = (overrides = {}) => ({
  vehicleId: VEHICLE_ID,
  startAt: isoDaysFromNow(1),
  endAt: isoDaysFromNow(4),
  ...overrides
});

// --- T020: past dates and inverted ranges are refused before any database lookup ---

test('booking: a start date in the past is refused without touching the database', async () => {
  let vehicleLookups = 0;
  const res = await withStubs([
    [Vehicle, 'findOne', () => { vehicleLookups++; return chain(null); }]
  ], () =>
    run(createBooking, {
      userId: USER_ID,
      body: validBody({ startAt: isoDaysFromNow(-1) }),
      currentUser: {}
    })
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Invalid booking dates');
  assert.equal(vehicleLookups, 0);
});

test('booking: an end date before the start date is refused', async () => {
  const res = await run(createBooking, {
    userId: USER_ID,
    body: validBody({ startAt: isoDaysFromNow(4), endAt: isoDaysFromNow(1) }),
    currentUser: {}
  });
  assert.equal(res.statusCode, 400);
});

test('booking: equal start and end dates are refused', async () => {
  const same = isoDaysFromNow(2);
  const res = await run(createBooking, {
    userId: USER_ID,
    body: validBody({ startAt: same, endAt: same }),
    currentUser: {}
  });
  assert.equal(res.statusCode, 400);
});

test('booking: a valid multi-day range passes the date check and reaches the vehicle lookup', async () => {
  const res = await withStubs([
    [Vehicle, 'findOne', () => chain(null)]
  ], () => run(createBooking, { userId: USER_ID, body: validBody(), currentUser: {} }));
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Vehicle not found');
});

// --- T019: pickup and return branches must exist and be active ---

test('booking: a malformed pickup branch id is refused', async () => {
  const res = await run(createBooking, {
    userId: USER_ID,
    body: validBody({ pickupBranch: 'not-an-id' }),
    currentUser: {}
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Invalid pickup branch');
});

test('booking: an inactive pickup branch is refused', async () => {
  const res = await withStubs([
    [Branch, 'findById', () => chain({ isActive: false })]
  ], () => run(createBooking, {
    userId: USER_ID,
    body: validBody({ pickupBranch: OWN_BRANCH }),
    currentUser: {}
  }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Pickup branch is not active');
});

test('booking: an unknown return branch is refused', async () => {
  const res = await withStubs([
    [Branch, 'findById', () => chain(null)]
  ], () => run(createBooking, {
    userId: USER_ID,
    body: validBody({ returnBranch: FOREIGN_BRANCH }),
    currentUser: {}
  }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Invalid return branch');
});

// --- T018: request validator ---

test('booking validator: reports missing required fields', async () => {
  const paths = await runRules(bookingRules.create, {});
  for (const field of ['vehicleId', 'startAt', 'endAt']) {
    assert.ok(paths.includes(field), `expected an error on ${field}`);
  }
});

test('booking validator: rejects malformed ids, dates and an over-long idempotency key', async () => {
  const paths = await runRules(bookingRules.create, validBody({
    vehicleId: 'nope',
    startAt: 'tomorrow-ish',
    idempotencyKey: 'k'.repeat(129)
  }));
  assert.ok(paths.includes('vehicleId'));
  assert.ok(paths.includes('startAt'));
  assert.ok(paths.includes('idempotencyKey'));
});

test('booking validator: accepts a complete payload', async () => {
  const paths = await runRules(bookingRules.create, validBody());
  assert.deepEqual(paths, []);
});

// --- T012: agency searches stay inside the branch scope ---

test('agency search cannot widen the branch scope', async () => {
  let filter;
  await withStubs([
    [Booking, 'find', (received) => { filter = received; return chain([]); }],
    [Booking, 'countDocuments', async () => 0]
  ], () => run(getAgentBookings, {
    query: { search: 'a.b' },
    currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
  }));

  assert.equal(filter.$or, undefined);
  const scope = filter.$and.find((condition) => condition.$or);
  assert.deepEqual(scope, {
    $or: [
      { pickupBranch: { $in: [OWN_BRANCH] } },
      { returnBranch: { $in: [OWN_BRANCH] } }
    ]
  });
  const search = filter.$and.find((condition) => condition.notes);
  assert.equal(search.notes.source, 'a\\.b');
});

test('agency manager cannot filter bookings by a branch outside their scope', async () => {
  let queried = false;
  const res = await withStubs([
    [Booking, 'find', () => { queried = true; return chain([]); }],
    [Booking, 'countDocuments', async () => 0]
  ], () => run(getAgentBookings, {
    query: { branchId: FOREIGN_BRANCH },
    currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
  }));
  assert.equal(res.statusCode, 400);
  assert.equal(queried, false);
});

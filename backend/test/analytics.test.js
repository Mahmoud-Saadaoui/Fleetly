const { test } = require('node:test');
const assert = require('node:assert/strict');

const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const { getProfitability, getOverview } = require('../controllers/analyticsController');

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

const withStubs = async (stubs, fn) => {
  const originals = stubs.map(([target, key]) => [target, key, target[key]]);
  stubs.forEach(([target, key, implementation]) => { target[key] = implementation; });
  try { return await fn(); }
  finally { originals.forEach(([target, key, original]) => { target[key] = original; }); }
};

test('profitability applies pagination and returns exact metadata', async () => {
  const calls = { sort: null, skip: null, limit: null };
  const pageVehicles = [
    { _id: 'vehicle-2', make: 'B', model: 'Two', category: 'SUV', maintenanceCostCents: 100, ownershipCostCentsPerDay: 10 },
    { _id: 'vehicle-3', make: 'C', model: 'Three', category: 'SUV', maintenanceCostCents: 200, ownershipCostCentsPerDay: 20 }
  ];
  const vehicleQuery = {
    sort(value) { calls.sort = value; return vehicleQuery; },
    skip(value) { calls.skip = value; return vehicleQuery; },
    limit(value) { calls.limit = value; return vehicleQuery; },
    lean: async () => pageVehicles
  };
  const bookingQuery = {
    select() { return bookingQuery; },
    lean: async () => []
  };

  const res = await withStubs([
    [Vehicle, 'find', () => vehicleQuery],
    [Vehicle, 'countDocuments', async () => 7],
    [Booking, 'find', () => bookingQuery]
  ], async () => {
    const response = makeResponse();
    await getProfitability({ query: { page: '2', limit: '2', range: '30d' } }, response, () => {});
    return response;
  });

  assert.deepEqual(calls.sort, { _id: 1 });
  assert.equal(calls.skip, 2);
  assert.equal(calls.limit, 2);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 2);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 2, total: 7, pages: 4 });
});

test('overview uses overlap logic and excludes maintenance from denominator', async () => {
  const now = Date.now();
  const day = 86400000;
  const bookings = [
    { startAt: new Date(now - day), endAt: new Date(now + day), pricing: { totalCents: 10000 } },
    { startAt: new Date(now - 5 * day), endAt: new Date(now - 2 * day), pricing: { totalCents: 5000 } }
  ];
  const bookingQuery = { select() { return bookingQuery; }, lean: async () => bookings };
  let fleetTotal = 0;
  let maintenanceFleet = 0;
  const originalCount = Vehicle.countDocuments;
  Vehicle.countDocuments = async (filter) => {
    if (JSON.stringify(filter) === JSON.stringify({ isDeleted: false, status: { $ne: 'retired' } })) { fleetTotal++; return 10; }
    if (JSON.stringify(filter) === JSON.stringify({ isDeleted: false, status: { $in: ['available', 'reserved', 'rented'] } })) return 6;
    if (JSON.stringify(filter) === JSON.stringify({ isDeleted: false, status: 'maintenance' })) { maintenanceFleet++; return 3; }
    return 0;
  };
  const res = await withStubs([
    [Booking, 'find', () => bookingQuery]
  ], async () => {
    const response = makeResponse();
    await getOverview({ query: { range: '7d' } }, response, () => {});
    return response;
  });
  Vehicle.countDocuments = originalCount;
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.bookings, 2);
  assert.ok(res.body.data.rentedDays >= 1);
  assert.equal(res.body.data.availableDays, 7 * (10 - 3));
  assert.equal(res.body.data.maintenanceFleet, 3);
});

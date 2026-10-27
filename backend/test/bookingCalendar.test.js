const { test } = require('node:test');
const assert = require('node:assert/strict');

const Booking = require('../models/booking');
const { getAgentBookings } = require('../controllers/bookingAgentController');

const BRANCH_ID = '66f1a2b3c4d5e6f7a8b9c0d1';
const VEHICLE_ID = '77f1a2b3c4d5e6f7a8b9c0d2';

const chain = (result) => {
  const query = {
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    lean: async () => result
  };
  return query;
};

const run = async (query) => {
  const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await getAgentBookings({ query, currentUser: { role: 'admin', branchIds: [] } }, response, () => {});
  return response;
};

test('calendar endpoint combines visible date range and branch, vehicle, status filters', async () => {
  let receivedFilter;
  const originalFind = Booking.find;
  const originalCount = Booking.countDocuments;
  Booking.find = (filter) => { receivedFilter = filter; return chain([]); };
  Booking.countDocuments = async () => 120;
  try {
    const response = await run({
      dateFrom: '2026-10-01T00:00:00.000Z',
      dateTo: '2026-10-31T23:59:59.999Z',
      branchId: BRANCH_ID,
      vehicleId: VEHICLE_ID,
      status: 'confirmed',
      page: '1',
      limit: '100'
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.pagination.total, 120);
    assert.equal(receivedFilter.vehicle, VEHICLE_ID);
    assert.equal(receivedFilter.status, 'confirmed');
    assert.deepEqual(receivedFilter.$and[0], { $or: [{ pickupBranch: BRANCH_ID }, { returnBranch: BRANCH_ID }] });
    assert.deepEqual(receivedFilter.$and[1], {
      $and: [
        { endAt: { $gte: new Date('2026-10-01T00:00:00.000Z') } },
        { startAt: { $lte: new Date('2026-10-31T23:59:59.999Z') } }
      ]
    });
  } finally {
    Booking.find = originalFind;
    Booking.countDocuments = originalCount;
  }
});

test('calendar endpoint rejects invalid date filters', async () => {
  const response = await run({ dateFrom: 'not-a-date' });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Invalid start date');
});

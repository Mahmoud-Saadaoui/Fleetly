const { test } = require('node:test');
const assert = require('node:assert/strict');

const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const { getVehicles } = require('../controllers/vehicleController');

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

const chain = (result) => {
  const query = {
    sort: () => query,
    skip: () => query,
    limit: () => query,
    select: () => query,
    lean: async () => result
  };
  return query;
};

test('vehicle catalogue marks a free vehicle available for the requested window', async () => {
  const originalFind = Vehicle.find;
  const originalCount = Vehicle.countDocuments;
  const originalDistinct = Booking.distinct;
  Vehicle.find = () => chain([{ _id: 'vehicle-1', status: 'available' }]);
  Vehicle.countDocuments = async () => 1;
  Booking.distinct = async () => [];
  try {
    const response = makeResponse();
    await getVehicles({ query: { from: '2026-10-10T10:00:00.000Z', to: '2026-10-12T10:00:00.000Z' } }, response, () => {});
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data[0].available, true);
  } finally {
    Vehicle.find = originalFind;
    Vehicle.countDocuments = originalCount;
    Booking.distinct = originalDistinct;
  }
});

test('vehicle catalogue marks a reserved date window unavailable', async () => {
  const originalFind = Vehicle.find;
  const originalCount = Vehicle.countDocuments;
  const originalDistinct = Booking.distinct;
  Vehicle.find = () => chain([{ _id: 'vehicle-1', status: 'available' }]);
  Vehicle.countDocuments = async () => 1;
  Booking.distinct = async () => ['vehicle-1'];
  try {
    const response = makeResponse();
    await getVehicles({ query: { from: '2026-10-10T10:00:00.000Z', to: '2026-10-12T10:00:00.000Z' } }, response, () => {});
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data[0].available, false);
  } finally {
    Vehicle.find = originalFind;
    Vehicle.countDocuments = originalCount;
    Booking.distinct = originalDistinct;
  }
});

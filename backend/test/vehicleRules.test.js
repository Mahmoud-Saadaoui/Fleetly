process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');

const Vehicle = require('../models/vehicle');
const Branch = require('../models/branch');
const vehicleRules = require('../validators/vehicleValidator');
const { updateVehicle } = require('../controllers/vehicleAdminController');
const { getVehicles, getVehicleById } = require('../controllers/vehicleController');

const VEHICLE_ID = '77f1a2b3c4d5e6f7a8b9c0d2';
const OWN_BRANCH = '66f1a2b3c4d5e6f7a8b9c0d1';
const FOREIGN_BRANCH = '66f1a2b3c4d5e6f7a8b9c0d2';

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

// Awaitable stand-in for a Mongoose query. `spy.select` observes the projection argument.
const chain = (result, spy = {}) => {
  const query = {
    select: (arg) => {
      if (spy.select) spy.select(arg);
      return query;
    },
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

test('vehicle update: agency_manager cannot move a vehicle to a foreign branch', async () => {
  let saved = false;
  let branchLookups = 0;
  const doc = { _id: VEHICLE_ID, branch: OWN_BRANCH, save: async () => { saved = true; } };

  const res = await withStubs([
    [Vehicle, 'findOne', async () => doc],
    [Branch, 'findById', () => { branchLookups++; return chain({ _id: FOREIGN_BRANCH }); }]
  ], () =>
    run(updateVehicle, {
      params: { id: VEHICLE_ID },
      body: { branch: FOREIGN_BRANCH },
      currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
    })
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Vehicle branch is outside your scope');
  assert.equal(branchLookups, 0);
  assert.equal(saved, false);
});

test('vehicle update: agency_manager can move a vehicle to an assigned branch', async () => {
  let saved = false;
  const doc = { _id: VEHICLE_ID, branch: OWN_BRANCH, save: async () => { saved = true; } };

  const res = await withStubs([
    [Vehicle, 'findOne', async () => doc],
    [Branch, 'findById', () => chain({ _id: OWN_BRANCH })],
    [Vehicle, 'findById', () => chain({ _id: VEHICLE_ID, branch: { name: 'Paris' } })]
  ], () =>
    run(updateVehicle, {
      params: { id: VEHICLE_ID },
      body: { branch: OWN_BRANCH },
      currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
    })
  );

  assert.equal(res.statusCode, 200);
  assert.equal(saved, true);
});

test('vehicle create validation: reports every missing required field', async () => {
  const paths = await runRules(vehicleRules.create, {});
  for (const field of ['make', 'model', 'registrationNumber', 'dailyRateCents']) {
    assert.ok(paths.includes(field), `expected an error on ${field}`);
  }
});

test('vehicle create validation: accepts a minimal complete payload', async () => {
  const paths = await runRules(vehicleRules.create, {
    make: 'Tesla', model: 'Model 3', registrationNumber: 'AB-123-CD', dailyRateCents: 5000
  });
  assert.deepEqual(paths, []);
});

test('vehicle create validation: rejects invalid enum and numeric values', async () => {
  const paths = await runRules(vehicleRules.create, {
    make: 'Tesla', model: 'Model 3', registrationNumber: 'AB-123-CD', dailyRateCents: 5000,
    transmission: 'Volant', seats: 0
  });
  assert.ok(paths.includes('transmission'));
  assert.ok(paths.includes('seats'));
});

test('public vehicle detail never selects vin or registration number', async () => {
  let projection;
  await withStubs([
    [Vehicle, 'findOne', (filter, selected) => {
      projection = selected;
      return chain({ _id: VEHICLE_ID, make: 'Tesla' });
    }]
  ], () => run(getVehicleById, { params: { id: VEHICLE_ID } }));

  assert.equal(projection, '-vin -registrationNumber');
});

test('public vehicle list never selects vin or registration number', async () => {
  let selected;
  await withStubs([
    [Vehicle, 'find', () => chain([], { select: (arg) => { selected = arg; } })],
    [Vehicle, 'countDocuments', async () => 0]
  ], () => run(getVehicles, { query: {} }));

  assert.equal(selected, '-vin -registrationNumber');
});

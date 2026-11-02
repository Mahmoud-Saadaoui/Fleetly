const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');
const support = require('./support');

const { skipReason, whenConfigured, clearAll, uriFor, connect, disconnect, models } = support;

const opts = { skip: skipReason };

before(whenConfigured(connect));
after(whenConfigured(disconnect));
beforeEach(whenConfigured(clearAll));

const runSeed = () => new Promise((resolve) => {
  const env = { ...process.env, MONGO_URI: uriFor(support.dbName), NODE_ENV: 'test', LOG_LEVEL: 'error' };
  execFile(process.execPath, [path.join(__dirname, '..', '..', 'seed', 'demo.js')], { env, timeout: 60000 },
    (error, stdout, stderr) => resolve({ error, stdout, stderr }));
});

test('seed: the demo seed runs and creates branches, vehicles, users and bookings', opts, async () => {
  const { error, stderr } = await runSeed();
  assert.equal(error, null, `seed failed: ${stderr}`);

  assert.ok(await models.Branch.countDocuments({}) >= 3, 'expected at least 3 branches');
  assert.ok(await models.Vehicle.countDocuments({}) >= 1, 'expected vehicles');
  assert.ok(await models.User.countDocuments({}) >= 1, 'expected users');
  assert.ok(await models.Booking.countDocuments({}) >= 1, 'expected bookings');
});

test('seed: the demo admin account has the canonical admin role and is active', opts, async () => {
  const { error } = await runSeed();
  assert.equal(error, null);

  const admin = await models.User.findOne({ email: 'admin@demo.com' }).lean();
  assert.ok(admin, 'admin@demo.com should exist');
  assert.equal(admin.role, 'admin');
  assert.equal(admin.isActive, true);
});

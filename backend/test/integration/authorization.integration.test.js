const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const support = require('./support');

const { skipReason, whenConfigured, clearAll, connect, disconnect, api, createUser, createBranch, createVehicle, tokenFor, inDays, models } = support;

const opts = { skip: skipReason };

before(whenConfigured(connect));
after(whenConfigured(disconnect));
beforeEach(whenConfigured(clearAll));

const bearer = (user) => `Bearer ${tokenFor(user)}`;

test('rbac: a client cannot list the admin user directory', opts, async () => {
  const user = await createUser({ role: 'user' });
  const res = await api.get('/api/admin/users').set('Authorization', bearer(user));
  assert.equal(res.status, 403);
});

test('rbac: an agency manager can list the admin user directory', opts, async () => {
  const manager = await createUser({ role: 'agency_manager' });
  const res = await api.get('/api/admin/users').set('Authorization', bearer(manager));
  assert.equal(res.status, 200);
});

test('rbac: an admin can list the admin user directory', opts, async () => {
  const admin = await createUser({ role: 'admin' });
  const res = await api.get('/api/admin/users').set('Authorization', bearer(admin));
  assert.equal(res.status, 200);
});

test('rbac: a client cannot change a booking status', opts, async () => {
  const client = await createUser({ role: 'user' });
  const branch = await createBranch();
  const vehicle = await createVehicle(branch);
  const booking = await models.Booking.create({
    customer: client._id,
    vehicle: vehicle._id,
    pickupBranch: branch._id,
    returnBranch: branch._id,
    startAt: new Date(inDays(5)),
    endAt: new Date(inDays(7)),
    pricing: { dailyRateCents: 5000, rentalDays: 2, subtotalCents: 10000, totalCents: 10000, currency: 'EUR' },
    status: 'confirmed',
  });

  const res = await api.patch(`/api/bookings/${booking._id}/status`)
    .set('Authorization', bearer(client))
    .send({ status: 'active' });
  assert.equal(res.status, 403);
});

test('rbac: a client cannot create a vehicle', opts, async () => {
  const client = await createUser({ role: 'user' });
  const res = await api.post('/api/vehicles').set('Authorization', bearer(client)).send({});
  assert.equal(res.status, 403);
});

test('rbac: a client can read its own bookings list', opts, async () => {
  const client = await createUser({ role: 'user' });
  const res = await api.get('/api/bookings/mine').set('Authorization', bearer(client));
  assert.equal(res.status, 200);
});

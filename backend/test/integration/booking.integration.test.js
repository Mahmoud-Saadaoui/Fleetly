const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const support = require('./support');

const { skipReason, whenConfigured, clearAll, connect, disconnect, api, createUser, createBranch, createVehicle, tokenFor, inDays, models } = support;

const opts = { skip: skipReason };

before(whenConfigured(connect));
after(whenConfigured(disconnect));
beforeEach(whenConfigured(clearAll));

const bearer = (user) => `Bearer ${tokenFor(user)}`;

const setup = async () => {
  const branch = await createBranch();
  const vehicle = await createVehicle(branch);
  return { branch, vehicle };
};

const bookingBody = (vehicle, branch, startDays, endDays) => ({
  vehicleId: vehicle._id.toString(),
  pickupBranch: branch._id.toString(),
  returnBranch: branch._id.toString(),
  startAt: inDays(startDays),
  endAt: inDays(endDays),
});

test('booking: a valid request creates a pending booking', opts, async () => {
  const { branch, vehicle } = await setup();
  const user = await createUser();

  const res = await api.post('/api/bookings')
    .set('Authorization', bearer(user))
    .send(bookingBody(vehicle, branch, 2, 5));

  assert.equal(res.status, 201);
  assert.equal(res.body.data.status, 'pending_payment');
  assert.equal(await models.Booking.countDocuments({ customer: user._id }), 1);
});

test('booking: an overlapping period on the same vehicle is refused with 409', opts, async () => {
  const { branch, vehicle } = await setup();
  const first = await createUser();
  const second = await createUser();

  const ok = await api.post('/api/bookings')
    .set('Authorization', bearer(first))
    .send(bookingBody(vehicle, branch, 2, 5));
  assert.equal(ok.status, 201);

  const clash = await api.post('/api/bookings')
    .set('Authorization', bearer(second))
    .send(bookingBody(vehicle, branch, 4, 8));
  assert.equal(clash.status, 409);
});

test('booking: a start date in the past is refused with 400', opts, async () => {
  const { branch, vehicle } = await setup();
  const user = await createUser();
  const res = await api.post('/api/bookings')
    .set('Authorization', bearer(user))
    .send(bookingBody(vehicle, branch, -2, 3));
  assert.equal(res.status, 400);
  assert.equal(await models.Booking.countDocuments({}), 0);
});

test('booking: an end date before the start date is refused with 400', opts, async () => {
  const { branch, vehicle } = await setup();
  const user = await createUser();
  const res = await api.post('/api/bookings')
    .set('Authorization', bearer(user))
    .send(bookingBody(vehicle, branch, 5, 2));
  assert.equal(res.status, 400);
});

test('booking: two simultaneous requests for the same window produce exactly one booking', opts, async () => {
  const { branch, vehicle } = await setup();
  const users = await Promise.all([createUser(), createUser(), createUser()]);

  const responses = await Promise.all(users.map((user) => api.post('/api/bookings')
    .set('Authorization', bearer(user))
    .send(bookingBody(vehicle, branch, 10, 14))));

  const created = responses.filter((r) => r.status === 201).length;
  const conflicts = responses.filter((r) => r.status === 409).length;
  assert.equal(created, 1, `expected exactly one 201, got statuses ${responses.map((r) => r.status)}`);
  assert.equal(conflicts, 2);
  assert.equal(await models.Booking.countDocuments({ vehicle: vehicle._id }), 1);
});

test('booking: the client bookings list is paginated', opts, async () => {
  const { branch, vehicle } = await setup();
  const user = await createUser();

  for (const [start, end] of [[1, 2], [3, 4], [5, 6]]) {
    const res = await api.post('/api/bookings')
      .set('Authorization', bearer(user))
      .send(bookingBody(vehicle, branch, start, end));
    assert.equal(res.status, 201);
  }

  const page1 = await api.get('/api/bookings/mine?page=1&limit=2').set('Authorization', bearer(user));
  assert.equal(page1.status, 200);
  assert.equal(page1.body.data.length, 2);
  assert.equal(page1.body.pagination.total, 3);
  assert.equal(page1.body.pagination.pages, 2);

  const page2 = await api.get('/api/bookings/mine?page=2&limit=2').set('Authorization', bearer(user));
  assert.equal(page2.body.data.length, 1);
});

test('booking: the client bookings list can be filtered by status', opts, async () => {
  const { branch, vehicle } = await setup();
  const user = await createUser();

  await api.post('/api/bookings').set('Authorization', bearer(user)).send(bookingBody(vehicle, branch, 1, 2));
  await models.Booking.create({
    customer: user._id,
    vehicle: vehicle._id,
    pickupBranch: branch._id,
    returnBranch: branch._id,
    startAt: new Date(inDays(20)),
    endAt: new Date(inDays(22)),
    pricing: { dailyRateCents: 5000, rentalDays: 2, subtotalCents: 10000, totalCents: 10000, currency: 'EUR' },
    status: 'confirmed',
  });

  const res = await api.get('/api/bookings/mine?status=confirmed').set('Authorization', bearer(user));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].status, 'confirmed');
});

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const support = require('./support');

const { skipReason, whenConfigured, clearAll, connect, disconnect, api, createUser, tokenFor, models } = support;

const opts = { skip: skipReason };

before(whenConfigured(connect));
after(whenConfigured(disconnect));
beforeEach(whenConfigured(clearAll));

test('auth: a registered user can log in and receive an access token', opts, async () => {
  const reg = await api.post('/api/users/register').send({
    name: 'Alice',
    email: 'alice@test.com',
    password: 'Passw0rd',
  });
  assert.equal(reg.status, 201);

  const res = await api.post('/api/users/login').send({ email: 'alice@test.com', password: 'Passw0rd' });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.accessToken);
});

test('auth: a wrong password is refused with 401', opts, async () => {
  await createUser({ email: 'bob@test.com' });
  const res = await api.post('/api/users/login').send({ email: 'bob@test.com', password: 'WrongPass1' });
  assert.equal(res.status, 401);
});

test('auth: a disabled account cannot log in', opts, async () => {
  await createUser({ email: 'carol@test.com', isActive: false });
  const res = await api.post('/api/users/login').send({ email: 'carol@test.com', password: 'Passw0rd' });
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Account is disabled');
});

test('auth: an existing token stops working as soon as the account is disabled', opts, async () => {
  const user = await createUser({ email: 'dave@test.com' });
  const token = tokenFor(user);

  const before = await api.get('/api/users/me').set('Authorization', `Bearer ${token}`);
  assert.equal(before.status, 200);

  await models.User.updateOne({ _id: user._id }, { isActive: false });

  const after = await api.get('/api/users/me').set('Authorization', `Bearer ${token}`);
  assert.equal(after.status, 401);
});

test('auth: a protected route without a token returns 401', opts, async () => {
  const res = await api.get('/api/users/me');
  assert.equal(res.status, 401);
});

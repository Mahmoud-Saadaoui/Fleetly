const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { validateEnv } = require('../config/validateEnv');

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const User = require('../models/user');
const auth = require('../middlewares/auth');
const { requestId } = require('../middlewares/requestId');

// Stubs User.findById for the duration of one test and returns a restore function.
const stubUser = (user) => {
  const original = User.findById;
  User.findById = () => ({ select: () => ({ lean: async () => user }) });
  return () => {
    User.findById = original;
  };
};

const createResponse = () => ({
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

test('rejects malformed authorization headers', () => {
  const response = createResponse();
  const request = {
    ip: '127.0.0.1',
    path: '/api/users/me',
    get: () => 'Token abc'
  };

  auth.check(request, response, () => {
    assert.fail('next should not be called');
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.message, 'Unauthorized');
});

test('accepts a valid Bearer token with an ObjectId subject', async () => {
  const token = jwt.sign(
    { sub: '507f1f77bcf86cd799439011' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
  const request = {
    get: () => `Bearer ${token}`
  };
  const response = createResponse();
  let nextCalled = false;

  const restore = stubUser({ isActive: true });
  try {
    await auth.check(request, response, () => {
      nextCalled = true;
    });
  } finally {
    restore();
  }

  assert.equal(nextCalled, true);
  assert.equal(request.userId, '507f1f77bcf86cd799439011');
});

test('rejects a valid Bearer token whose account is disabled', async () => {
  const token = jwt.sign(
    { sub: '507f1f77bcf86cd799439011' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
  const request = { ip: '127.0.0.1', path: '/api/users/me', get: () => `Bearer ${token}` };
  const response = createResponse();
  let nextCalled = false;

  const restore = stubUser({ isActive: false });
  try {
    await auth.check(request, response, () => {
      nextCalled = true;
    });
  } finally {
    restore();
  }

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 401);
});

test('replaces an invalid incoming request id', () => {
  const request = {
    get: () => 'request id with spaces'
  };
  const response = {
    header: null,
    setHeader(name, value) {
      this.header = { name, value };
    }
  };

  requestId(request, response, () => {});

  assert.match(request.id, /^[a-f0-9-]{36}$/);
  assert.equal(response.header.name, 'X-Request-ID');
  assert.equal(response.header.value, request.id);
});

test('rejects an invalid proxy configuration', () => {
  const requiredVariables = {
    MONGO_URI: 'mongodb://localhost:27017/fleetly',
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    JWT_EXPIRES_IN: '1h',
  };
  const previousValues = Object.fromEntries(
    Object.keys(requiredVariables).concat(['NODE_ENV', 'TRUST_PROXY_HOPS']).map((name) => [name, process.env[name]])
  );

  try {
    Object.assign(process.env, requiredVariables, {
      NODE_ENV: 'test',
      TRUST_PROXY_HOPS: '-1'
    });

    assert.throws(() => validateEnv(), /TRUST_PROXY_HOPS must be an integer/);
  } finally {
    for (const name of Object.keys(previousValues)) {
      if (previousValues[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousValues[name];
      }
    }
  }
});

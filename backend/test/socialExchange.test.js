const assert = require('node:assert/strict');
const test = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const User = require('../models/user');
const { exchangeSocialCode, issueExchangeCode } = require('../controllers/authSocialController');

const USER_ID = '507f1f77bcf86cd799439011';

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

const stubUser = (user) => {
  const original = User.findById;
  User.findById = () => ({ select: () => ({ lean: async () => user }) });
  return () => {
    User.findById = original;
  };
};

const exchange = async (code, user = { isActive: true }) => {
  const restore = stubUser(user);
  try {
    const res = makeResponse();
    await exchangeSocialCode({ body: { code } }, res, () => {});
    return res;
  } finally {
    restore();
  }
};

test('a valid one-time code is exchanged for an access token', async () => {
  const code = issueExchangeCode(USER_ID);
  const res = await exchange(code);
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body.data.accessToken, 'string');
});

test('a one-time code cannot be reused', async () => {
  const code = issueExchangeCode(USER_ID);
  await exchange(code);
  const second = await exchange(code);
  assert.equal(second.statusCode, 401);
});

test('an unknown code is rejected', async () => {
  const res = await exchange('not-a-real-code');
  assert.equal(res.statusCode, 401);
});

test('a code for a disabled account is rejected', async () => {
  const code = issueExchangeCode(USER_ID);
  const res = await exchange(code, { isActive: false });
  assert.equal(res.statusCode, 401);
});

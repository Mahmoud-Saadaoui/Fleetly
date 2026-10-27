process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Replace the Google profile service before the controller loads it.
const googleAuthPath = require.resolve('../services/googleAuth');
let googleProfile = async () => ({});
require.cache[googleAuthPath] = {
  id: googleAuthPath,
  filename: googleAuthPath,
  loaded: true,
  exports: {
    getGoogleAuthUrl: () => 'https://accounts.google.test',
    getGoogleProfile: (code) => googleProfile(code)
  }
};

const User = require('../models/user');
const { handleSocialCallback } = require('../controllers/authSocialController');

const USER_ID = '507f1f77bcf86cd799439011';

const makeResponse = () => ({
  statusCode: null,
  redirectedTo: null,
  redirect(url) {
    this.redirectedTo = url;
    return this;
  }
});

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

const callGoogle = async (query) => {
  const res = makeResponse();
  await handleSocialCallback('google')({ query }, res, () => {});
  return new URL(res.redirectedTo).searchParams;
};

test('social login: a new account is created with the user role and an active flag', async () => {
  googleProfile = async () => ({ sub: 'g-1', email: 'new@x.com', name: 'New' });
  let created;
  const params = await withStubs([
    [User, 'findOne', async () => null],
    [User, 'create', async (doc) => { created = doc; return { _id: USER_ID, isActive: true }; }]
  ], () => callGoogle({ code: 'abc' }));

  assert.equal(created.role, 'user');
  assert.equal(created.googleId, 'g-1');
  assert.equal(created.isActive, true);
  assert.ok(params.get('code'));
  assert.equal(params.get('token'), null);
});

test('social login: an existing account gets the provider id linked', async () => {
  googleProfile = async () => ({ sub: 'g-2', email: 'me@x.com', name: 'Me' });
  let saved = false;
  const doc = { _id: USER_ID, email: 'me@x.com', isActive: true, save: async () => { saved = true; } };
  const params = await withStubs([[User, 'findOne', async () => doc]], () => callGoogle({ code: 'abc' }));

  assert.equal(saved, true);
  assert.equal(doc.googleId, 'g-2');
  assert.ok(params.get('code'));
});

test('social login: an account linked to another Google id is refused', async () => {
  googleProfile = async () => ({ sub: 'g-new', email: 'me@x.com', name: 'Me' });
  let saved = false;
  const doc = { _id: USER_ID, isActive: true, googleId: 'g-other', save: async () => { saved = true; } };
  const params = await withStubs([[User, 'findOne', async () => doc]], () => callGoogle({ code: 'abc' }));

  assert.equal(params.get('error'), 'Account linked to a different social provider');
  assert.equal(params.get('code'), null);
  assert.equal(saved, false);
});

test('social login: a disabled account is refused', async () => {
  googleProfile = async () => ({ sub: 'g-1', email: 'me@x.com', name: 'Me' });
  const doc = { _id: USER_ID, isActive: false, googleId: 'g-1', save: async () => {} };
  const params = await withStubs([[User, 'findOne', async () => doc]], () => callGoogle({ code: 'abc' }));

  assert.equal(params.get('error'), 'Account is disabled');
  assert.equal(params.get('code'), null);
});

test('social login: an unverified provider email is reported to the user', async () => {
  googleProfile = async () => { throw new Error('Google email is not verified'); };
  const params = await callGoogle({ code: 'abc' });
  assert.equal(params.get('error'), 'Google email is not verified');
});

test('social login: unexpected failures do not leak internal details', async () => {
  googleProfile = async () => { throw new Error('connect ECONNREFUSED db.internal:27017'); };
  const params = await callGoogle({ code: 'abc' });
  assert.equal(params.get('error'), 'Social authentication failed');
});

test('social login: a missing authorization code is refused before any lookup', async () => {
  let looked = false;
  const params = await withStubs([[User, 'findOne', async () => { looked = true; return null; }]], () =>
    callGoogle({})
  );
  assert.equal(params.get('error'), 'Authorization code missing');
  assert.equal(looked, false);
});

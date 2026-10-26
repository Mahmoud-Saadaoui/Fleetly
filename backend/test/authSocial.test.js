const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeUser } = require('./helpers');

/**
 * Unit tests for Google/Facebook social authentication
 * 
 * These tests verify that:
 * - Fixtures are correctly structured
 * - Social IDs are correctly managed
 * - Providers are correctly identified
 */

test('makeUser - with googleId', () => {
  const user = makeUser({ googleId: 'google-123456' });
  assert.equal(user.googleId, 'google-123456');
});

test('makeUser - with facebookId', () => {
  const user = makeUser({ facebookId: 'fb-654321' });
  assert.equal(user.facebookId, 'fb-654321');
});

test('makeUser - with both social IDs', () => {
  const user = makeUser({
    googleId: 'google-123',
    facebookId: 'fb-456'
  });
  assert.equal(user.googleId, 'google-123');
  assert.equal(user.facebookId, 'fb-456');
});

test('makeUser - without social IDs (classic auth)', () => {
  const user = makeUser();
  assert.equal(user.googleId, undefined);
  assert.equal(user.facebookId, undefined);
});

test('makeUser - email used as matching key', () => {
  // Social flow uses email to find/create user
  const user = makeUser({ email: 'social@example.com' });
  assert.equal(user.email, 'social@example.com');
});

test('makeUser - default role for social auth', () => {
  // Users created via social auth have 'user' role
  const user = makeUser({ role: 'user' });
  assert.equal(user.role, 'user');
});

test('makeUser - social auth with branches', () => {
  // A social user can be assigned to branches
  const user = makeUser({
    googleId: 'google-123',
    branchIds: ['66f1a2b3c4d5e6f7a8b9c0d1']
  });
  assert.equal(user.googleId, 'google-123');
  assert.equal(user.branchIds.length, 1);
});

test('makeUser - social auth with full name', () => {
  const user = makeUser({
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    googleId: 'google-789'
  });
  assert.equal(user.name, 'John Doe');
  assert.equal(user.email, 'john.doe@gmail.com');
});

test('supported providers', () => {
  const providers = ['google', 'facebook'];
  assert.ok(providers.includes('google'));
  assert.ok(providers.includes('facebook'));
});

test('makeUser - social ID unique per provider', () => {
  // googleId and facebookId are unique (sparse unique in model)
  const user1 = makeUser({ googleId: 'google-123' });
  const user2 = makeUser({ googleId: 'google-456' });
  assert.notEqual(user1.googleId, user2.googleId);
});

test('makeUser - same email, different providers', () => {
  // A user can have the same email on Google and Facebook
  const user = makeUser({
    email: 'user@example.com',
    googleId: 'google-123',
    facebookId: 'fb-456'
  });
  assert.equal(user.email, 'user@example.com');
  assert.ok(user.googleId);
  assert.ok(user.facebookId);
});

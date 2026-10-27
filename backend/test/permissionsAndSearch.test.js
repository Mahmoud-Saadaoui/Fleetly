const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hasRole, isAtLeast, canManageUser, ROLE_HIERARCHY } = require('../utils/permissions');
const { escapeRegex, sanitizeSearchTerm, parseDateSafe, isValidObjectId } = require('../utils/search');

test('permissions: only the canonical roles are in the hierarchy', () => {
  assert.deepEqual(Object.keys(ROLE_HIERARCHY).sort(), ['admin', 'agency_manager', 'user']);
});

test('permissions: isAdmin flag counts as admin and a missing role defaults to user', () => {
  assert.equal(hasRole({ isAdmin: true, role: 'user' }, 'admin'), true);
  assert.equal(hasRole({}, 'user'), true);
  assert.equal(hasRole({}, 'agency_manager'), false);
});

test('permissions: isAtLeast follows the hierarchy', () => {
  assert.equal(isAtLeast({ role: 'admin' }, 'agency_manager'), true);
  assert.equal(isAtLeast({ role: 'agency_manager' }, 'user'), true);
  assert.equal(isAtLeast({ role: 'user' }, 'agency_manager'), false);
});

test('permissions: agency_manager can only manage the user role', () => {
  assert.equal(canManageUser({ role: 'agency_manager' }, 'user'), true);
  assert.equal(canManageUser({ role: 'agency_manager' }, 'agency_manager'), false);
  assert.equal(canManageUser({ role: 'agency_manager' }, 'admin'), false);
});

test('permissions: admin manages every role and user manages none', () => {
  assert.equal(canManageUser({ role: 'admin' }, 'admin'), true);
  assert.equal(canManageUser({ role: 'user' }, 'user'), false);
});

test('search: escapeRegex keeps metacharacters literal', () => {
  const regex = new RegExp(escapeRegex('a.*(b)'), 'i');
  assert.equal(regex.test('a.*(b)'), true);
  assert.equal(regex.test('aXYZb'), false);
});

test('search: sanitizeSearchTerm trims, rejects blank and over-long input', () => {
  assert.equal(sanitizeSearchTerm('  tesla '), 'tesla');
  assert.equal(sanitizeSearchTerm('   '), null);
  assert.equal(sanitizeSearchTerm(42), null);
  assert.equal(sanitizeSearchTerm('x'.repeat(61)), false);
});

test('search: parseDateSafe returns null for empty, false for invalid, a Date otherwise', () => {
  assert.equal(parseDateSafe(undefined), null);
  assert.equal(parseDateSafe('not a date'), false);
  assert.ok(parseDateSafe('2030-01-01') instanceof Date);
});

test('search: isValidObjectId rejects malformed ids', () => {
  assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidObjectId('not-an-id'), false);
});

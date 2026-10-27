process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const Branch = require('../models/branch');
const { getBranches } = require('../controllers/branchController');

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

const chain = (result) => {
  const query = {
    select: () => query,
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    lean: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return query;
};

// Captures the filter passed to Branch.find for one call of getBranches.
const captureFilter = async (req) => {
  let filter;
  const originalFind = Branch.find;
  const originalCount = Branch.countDocuments;
  Branch.find = (received) => {
    filter = received;
    return chain([]);
  };
  Branch.countDocuments = async () => 0;
  try {
    await getBranches(req, makeResponse(), () => {});
  } finally {
    Branch.find = originalFind;
    Branch.countDocuments = originalCount;
  }
  return filter;
};

test('branch list hides inactive branches from anonymous visitors', async () => {
  const filter = await captureFilter({ query: {} });
  assert.deepEqual(filter.isActive, { $ne: false });
});

test('branch list ignores includeInactive from anonymous visitors', async () => {
  const filter = await captureFilter({ query: { includeInactive: 'true' } });
  assert.deepEqual(filter.isActive, { $ne: false });
});

test('branch list shows inactive branches to staff who ask for them', async () => {
  const filter = await captureFilter({
    query: { includeInactive: 'true' },
    currentUser: { role: 'admin' }
  });
  assert.equal(filter.isActive, undefined);
});

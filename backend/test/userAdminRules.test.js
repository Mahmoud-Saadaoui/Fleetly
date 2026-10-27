process.env.BCRYPT_ROUNDS = '4';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const User = require('../models/user');
const { inviteUser, updateUser } = require('../controllers/userAdminController');

const USER_ID = '507f1f77bcf86cd799439011';
const OWN_BRANCH = '66f1a2b3c4d5e6f7a8b9c0d1';
const FOREIGN_BRANCH = '66f1a2b3c4d5e6f7a8b9c0d2';

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

// Awaitable stand-in for a Mongoose query: supports the chained methods used by the controller.
const chain = (result) => {
  const query = {
    select: () => query,
    populate: () => query,
    lean: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return query;
};

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

const run = async (handler, req) => {
  const res = makeResponse();
  const errors = [];
  await handler(req, res, (error) => errors.push(error));
  if (errors.length) throw errors[0];
  return res;
};

// Returns the given documents in order on successive User.findById calls.
const findByIdSequence = (...documents) => {
  let index = 0;
  return () => chain(documents[Math.min(index++, documents.length - 1)]);
};

test('invite: agency_manager cannot invite an admin', async () => {
  let created = false;
  const res = await withStubs([[User, 'create', async () => { created = true; }]], () =>
    run(inviteUser, {
      body: { name: 'Root', email: 'root@x.com', role: 'admin', branchIds: [] },
      currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
    })
  );
  assert.equal(res.statusCode, 403);
  assert.equal(created, false);
});

test('invite: agency_manager cannot assign a branch outside their scope', async () => {
  let created = false;
  const res = await withStubs([[User, 'create', async () => { created = true; }]], () =>
    run(inviteUser, {
      body: { name: 'Agent', email: 'agent@x.com', role: 'user', branchIds: [FOREIGN_BRANCH] },
      currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
    })
  );
  assert.equal(res.statusCode, 403);
  assert.equal(created, false);
});

test('invite: admin can invite an admin and the response carries no secret', async () => {
  const res = await withStubs([
    [User, 'findOne', async () => null],
    [User, 'create', async (doc) => ({ _id: USER_ID, name: doc.name, email: doc.email, role: doc.role, branchIds: [] })]
  ], () =>
    run(inviteUser, {
      body: { name: 'Root', email: 'root@x.com', role: 'admin' },
      currentUser: { isAdmin: true, role: 'user' }
    })
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.role, 'admin');
  assert.equal('inviteToken' in res.body.data, false);
  assert.equal('tempPassword' in res.body.data, false);
});

test('update: agency_manager cannot promote a user to admin', async () => {
  let saved = false;
  const doc = { _id: USER_ID, role: 'user', branchIds: [], save: async () => { saved = true; } };
  const res = await withStubs([[User, 'findById', findByIdSequence(doc)]], () =>
    run(updateUser, {
      params: { id: USER_ID },
      body: { role: 'admin' },
      currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
    })
  );
  assert.equal(res.statusCode, 403);
  assert.equal(saved, false);
});

test('update: agency_manager cannot assign a branch outside their scope', async () => {
  let saved = false;
  const doc = { _id: USER_ID, role: 'user', branchIds: [], save: async () => { saved = true; } };
  const res = await withStubs([[User, 'findById', findByIdSequence(doc)]], () =>
    run(updateUser, {
      params: { id: USER_ID },
      body: { branchIds: [FOREIGN_BRANCH] },
      currentUser: { role: 'agency_manager', branchIds: [OWN_BRANCH] }
    })
  );
  assert.equal(res.statusCode, 403);
  assert.equal(saved, false);
});

test('update: admin can promote a user to admin', async () => {
  const doc = { _id: USER_ID, role: 'user', branchIds: [], save: async () => {} };
  const updated = { _id: USER_ID, role: 'admin', branchIds: [] };
  const res = await withStubs([[User, 'findById', findByIdSequence(doc, updated)]], () =>
    run(updateUser, {
      params: { id: USER_ID },
      body: { role: 'admin' },
      currentUser: { role: 'admin', branchIds: [] }
    })
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.role, 'admin');
});

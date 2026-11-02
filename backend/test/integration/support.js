process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
// Each request gets its own X-Forwarded-For address so the auth rate limiter
// (5 requests / 15 min per IP) does not leak between test cases.
process.env.TRUST_PROXY_HOPS = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const Branch = require('../../models/branch');
const Vehicle = require('../../models/vehicle');
const Booking = require('../../models/booking');
const { makeToken } = require('../helpers');

const MONGO_TEST_URI = process.env.MONGO_TEST_URI;
const skipReason = MONGO_TEST_URI
  ? false
  : 'MONGO_TEST_URI is not set: point it at a MongoDB replica set (transactions need one), e.g. mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';

const dbName = `fleetly_it_${process.pid}`;

// MONGO_TEST_URI is a server URI without a database, e.g. mongodb://host:27017/?replicaSet=rs0
const uriFor = (database) => MONGO_TEST_URI.replace('/?', `/${database}?`);

const connect = async () => {
  await mongoose.connect(uriFor(dbName), { serverSelectionTimeoutMS: 5000 });
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

const whenConfigured = (fn) => async () => {
  if (!skipReason) await fn();
};

const clearAll = () => Promise.all([User, Branch, Vehicle, Booking].map((m) => m.deleteMany({})));

let ipCounter = 0;
const nextIp = () => {
  ipCounter += 1;
  return `10.${Math.floor(ipCounter / 65536) % 256}.${Math.floor(ipCounter / 256) % 256}.${ipCounter % 256}`;
};

const api = {
  get: (url) => request(app).get(url).set('X-Forwarded-For', nextIp()),
  post: (url) => request(app).post(url).set('X-Forwarded-For', nextIp()),
  patch: (url) => request(app).patch(url).set('X-Forwarded-For', nextIp()),
};

let seq = 0;
const uniq = () => {
  seq += 1;
  return seq;
};

const createUser = async (overrides = {}) => User.create({
  name: 'Test User',
  email: `user${uniq()}@test.com`,
  password: await bcrypt.hash('Passw0rd', 4),
  role: 'user',
  isActive: true,
  branchIds: [],
  ...overrides,
});

const createBranch = async (overrides = {}) => Branch.create({
  name: `Branch ${uniq()}`,
  code: `BR${uniq()}`,
  address: { city: 'Paris', country: 'FR' },
  isActive: true,
  ...overrides,
});

const createVehicle = async (branch, overrides = {}) => Vehicle.create({
  make: 'Tesla',
  model: 'Model 3',
  category: 'Électrique',
  registrationNumber: `AB-${uniq()}-CD`,
  branch: branch._id,
  dailyRateCents: 5000,
  currency: 'EUR',
  seats: 5,
  transmission: 'Automatique',
  fuelType: 'Électrique',
  status: 'available',
  ...overrides,
});

const tokenFor = (user) => makeToken({ _id: user._id.toString() });

const DAY_MS = 86400000;
const inDays = (days) => new Date(Date.now() + days * DAY_MS).toISOString();

module.exports = {
  MONGO_TEST_URI,
  skipReason,
  uriFor,
  dbName,
  connect,
  disconnect,
  whenConfigured,
  clearAll,
  api,
  createUser,
  createBranch,
  createVehicle,
  tokenFor,
  inDays,
  mongoose,
  models: { User, Branch, Vehicle, Booking },
};

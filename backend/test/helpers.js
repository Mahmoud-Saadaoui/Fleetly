const jwt = require('jsonwebtoken');

/**
 * Test helpers — fixtures and utilities
 * 
 * These functions create reusable objects for tests.
 * They keep tests readable and DRY.
 */

// JWT configuration for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Generates a valid JWT token for a test user
 * 
 * @param {Object} user - { _id, role, branchIds }
 * @returns {string} JWT token
 */
function makeToken(user) {
  return jwt.sign(
    { sub: user._id || '507f1f77bcf86cd799439011' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
}

/**
 * Creates a test user object
 * 
 * @param {Object} overrides - Fields to override
 * @returns {Object} Test user
 */
function makeUser(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    branchIds: [],
    isActive: true,
    ...overrides
  };
}

/**
 * Creates a test branch object
 * 
 * @param {Object} overrides - Fields to override
 * @returns {Object} Test branch
 */
function makeBranch(overrides = {}) {
  return {
    _id: '66f1a2b3c4d5e6f7a8b9c0d1',
    name: 'Paris Branch',
    code: 'PAR',
    address: { city: 'Paris', country: 'FR' },
    ...overrides
  };
}

/**
 * Creates a test vehicle object
 * 
 * @param {Object} overrides - Fields to override
 * @returns {Object} Test vehicle
 */
function makeVehicle(overrides = {}) {
  return {
    _id: '77f1a2b3c4d5e6f7a8b9c0d2',
    make: 'Tesla',
    model: 'Model 3',
    category: 'Électrique',
    registrationNumber: 'AB-123-CD',
    branch: '66f1a2b3c4d5e6f7a8b9c0d1',
    dailyRateCents: 5000,
    currency: 'EUR',
    status: 'available',
    isDeleted: false,
    ...overrides
  };
}

/**
 * Creates a test booking object
 * 
 * @param {Object} overrides - Fields to override
 * @returns {Object} Test booking
 */
function makeBooking(overrides = {}) {
  return {
    _id: '88f1a2b3c4d5e6f7a8b9c0d3',
    customer: '507f1f77bcf86cd799439011',
    vehicle: '77f1a2b3c4d5e6f7a8b9c0d2',
    pickupBranch: '66f1a2b3c4d5e6f7a8b9c0d1',
    returnBranch: '66f1a2b3c4d5e6f7a8b9c0d1',
    startAt: new Date('2026-01-15T10:00:00.000Z'),
    endAt: new Date('2026-01-20T10:00:00.000Z'),
    status: 'confirmed',
    pricing: {
      dailyRateCents: 5000,
      rentalDays: 5,
      totalCents: 25000,
      currency: 'EUR'
    },
    ...overrides
  };
}

/**
 * Creates a mock Express response
 * 
 * @returns {Object} Mock response
 */
function createMockResponse() {
  return {
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
  };
}

/**
 * Creates a mock Express request
 * 
 * @param {Object} options - { query, params, body, userId, currentUser }
 * @returns {Object} Mock request
 */
function createMockRequest(options = {}) {
  return {
    query: options.query || {},
    params: options.params || {},
    body: options.body || {},
    userId: options.userId || '507f1f77bcf86cd799439011',
    currentUser: options.currentUser || makeUser(),
    get: () => `Bearer ${makeToken(options.currentUser || makeUser())}`
  };
}

module.exports = {
  makeToken,
  makeUser,
  makeBranch,
  makeVehicle,
  makeBooking,
  createMockResponse,
  createMockRequest
};

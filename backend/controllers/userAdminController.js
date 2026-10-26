const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/user');
const Branch = require('../models/branch');
const bcrypt = require('bcryptjs');
const jwtHelpers = require('../utils/jwtHelpers');
const { asyncHandler } = require('../middlewares/asyncHandler');
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
  paginatedResponse
} = require('../utils/apiResponse');
const { parsePagination, getPaginationMeta } = require('../utils/pagination');

/**
 * Paginated list of users with filters
 * GET /api/admin/users
 */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  // Build filter from query parameters
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
    filter.branchIds = req.query.branchId;
  }
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email role branchIds isActive createdAt')
      .populate('branchIds', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  return paginatedResponse(res, users, getPaginationMeta(page, limit, total), 'Users retrieved successfully');
});

/**
 * Get user details by ID
 * GET /api/admin/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('name email role branchIds isActive createdAt')
    .populate('branchIds', 'name code')
    .lean();

  if (!user) {
    return notFoundResponse(res, 'User');
  }

  return successResponse(res, user, 'User retrieved successfully');
});

/**
 * Update a user (role, branches, status)
 * PATCH /api/admin/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { role, branchIds, isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return notFoundResponse(res, 'User');
  }

  const actor = req.currentUser || {};
  const actorRole = actor.isAdmin ? 'admin' : actor.role || 'user';

  if (role !== undefined) {
    if (role === 'admin' && actorRole !== 'admin') {
      return forbiddenResponse(res, 'Insufficient permissions');
    }
    if (actorRole === 'agency_manager' && role !== 'user') {
      return forbiddenResponse(res, 'Insufficient permissions');
    }
    user.role = role;
  }

  if (branchIds !== undefined) {
    if (actorRole === 'agency_manager') {
      if (!Array.isArray(branchIds) || branchIds.length === 0) {
        return badRequestResponse(res, 'Agency manager can only assign to assigned branches');
      }
      const actorBranches = (actor.branchIds || []).map((id) => String(id));
      const allAssigned = branchIds.every((id) => actorBranches.includes(String(id)));
      if (!allAssigned) {
        return forbiddenResponse(res, 'Cannot assign branches outside your scope');
      }
    }
    const validBranches = await Branch.find({ _id: { $in: branchIds } }).select('_id');
    if (validBranches.length !== branchIds.length) {
      return badRequestResponse(res, 'One or more branches are invalid');
    }
    user.branchIds = branchIds;
  }

  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  const updatedUser = await User.findById(user._id)
    .select('name email role branchIds isActive')
    .populate('branchIds', 'name code')
    .lean();

  return successResponse(res, updatedUser, 'User updated successfully');
});

/**
 * Delete a user (soft delete)
 * DELETE /api/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return notFoundResponse(res, 'User');
  }

  // Soft delete: deactivate account
  user.isActive = false;
  await user.save();

  return successResponse(res, null, 'User deleted successfully');
});

/**
 * Invite a new user
 * POST /api/admin/users/invite
 */
const inviteUser = asyncHandler(async (req, res) => {
  const { name, email, role = 'user', branchIds = [] } = req.body;
  const actor = req.currentUser || {};
  const actorRole = actor.isAdmin ? 'admin' : actor.role || 'user';

  if (role === 'admin' && actorRole !== 'admin') {
    return forbiddenResponse(res, 'Insufficient permissions');
  }
  if (actorRole === 'agency_manager') {
    if (role === 'admin') {
      return forbiddenResponse(res, 'Insufficient permissions');
    }
    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      return badRequestResponse(res, 'Agency manager can only invite to assigned branches');
    }
    const actorBranches = (actor.branchIds || []).map((id) => String(id));
    const allAssigned = branchIds.every((id) => actorBranches.includes(String(id)));
    if (!allAssigned) {
      return forbiddenResponse(res, 'Cannot assign branches outside your scope');
    }
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return conflictResponse(res, 'A user with this email already exists');
  }

  // Validate branchIds
  if (branchIds.length > 0) {
    const validBranches = await Branch.find({ _id: { $in: branchIds } }).select('_id');
    if (validBranches.length !== branchIds.length) {
      return badRequestResponse(res, 'One or more branches are invalid');
    }
  }

  // Generate random temporary password
  const tempPassword = crypto.randomBytes(12).toString('hex');
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    branchIds,
    isActive: true
  });

  // Generate invitation token (valid 7 days)
  const inviteToken = jwtHelpers.sign({ sub: user._id }, '7d');

  // TODO: Send invitation email with link
  // await sendInviteEmail(email, inviteToken);

  return createdResponse(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchIds: user.branchIds,
    inviteToken // Remove once email is implemented
  }, 'User invited successfully');
});

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  inviteUser
};

const Branch = require('../models/branch');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');
const User = require('../models/user');
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
 * Create a new branch
 * POST /api/branches
 */
const createBranch = asyncHandler(async (req, res) => {
  const { name, code, address, phone, email } = req.body;

  // Check code uniqueness
  const existing = await Branch.findOne({ code: code.toUpperCase() });
  if (existing) {
    return badRequestResponse(res, `Branch code "${code}" already exists`);
  }

  const branch = await Branch.create({
    name,
    code: code.toUpperCase(),
    address,
    phone,
    email
  });

  return createdResponse(res, branch, 'Branch created successfully');
});

/**
 * Paginated list of branches
 * GET /api/branches
 */
const getBranches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  // Optional filter by city
  const filter = {};
  if (req.query.city) filter['address.city'] = new RegExp(req.query.city, 'i');
  // Inactive branches are hidden unless a staff member explicitly asks for them
  const isStaff = ['admin', 'agency_manager'].includes(req.currentUser?.role);
  if (!(isStaff && req.query.includeInactive === 'true')) {
    filter.isActive = { $ne: false };
  }

  const [branches, total] = await Promise.all([
    Branch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Branch.countDocuments(filter)
  ]);

  return paginatedResponse(res, branches, getPaginationMeta(page, limit, total), 'Branches retrieved successfully');
});

/**
 * Get branch details by ID
 * GET /api/branches/:id
 */
const getBranchById = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id).lean();
  if (!branch) {
    return notFoundResponse(res, 'Branch');
  }
  return successResponse(res, branch, 'Branch retrieved successfully');
});

/**
 * Update a branch
 * PATCH /api/branches/:id
 */
const updateBranch = asyncHandler(async (req, res) => {
  const { name, code, address, phone, email } = req.body;

  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    return notFoundResponse(res, 'Branch');
  }

  // Check code uniqueness if changed
  if (code && code.toUpperCase() !== branch.code) {
    const existing = await Branch.findOne({ code: code.toUpperCase() });
    if (existing) {
      return badRequestResponse(res, `Branch code "${code}" already exists`);
    }
    branch.code = code.toUpperCase();
  }

  // Update provided fields
  if (name !== undefined) branch.name = name;
  if (address !== undefined) branch.address = { ...branch.address, ...address };
  if (phone !== undefined) branch.phone = phone;
  if (email !== undefined) branch.email = email;

  await branch.save();
  return successResponse(res, branch, 'Branch updated successfully');
});

/**
 * Delete a branch
 * DELETE /api/branches/:id
 *
 * Deletion is blocked while the branch is still referenced by vehicles or
 * bookings, to avoid dangling references. Users referencing the branch are
 * detached automatically.
 */
const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    return notFoundResponse(res, 'Branch');
  }

  // Block deletion while the branch is still referenced
  const [vehicleCount, bookingCount] = await Promise.all([
    Vehicle.countDocuments({ branch: branch._id, isDeleted: false }),
    Booking.countDocuments({
      $or: [{ pickupBranch: branch._id }, { returnBranch: branch._id }]
    })
  ]);

  if (vehicleCount > 0 || bookingCount > 0) {
    return conflictResponse(
      res,
      'Cannot delete: branch is still referenced by vehicles or bookings'
    );
  }

  // Detach the branch from any users
  await User.updateMany({ branchIds: branch._id }, { $pull: { branchIds: branch._id } });

  await Branch.findByIdAndDelete(branch._id);

  return successResponse(res, null, 'Branch deleted successfully');
});

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch
};

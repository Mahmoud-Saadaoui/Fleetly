const mongoose = require('mongoose');
const Booking = require('../models/booking');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { badRequestResponse, paginatedResponse } = require('../utils/apiResponse');
const { parsePagination, getPaginationMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/search');

/**
 * Bookings visible to an agent (filtered by their branches)
 * GET /api/agent/bookings
 *
 * - Agent: only sees bookings for their branches (pickupBranch or returnBranch)
 * - Admin / fleet_manager: see all bookings
 */
const getAgentBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  // Build base filter
  const filter = {};
  const conditions = [];

  // Filter by branch if user is an agency manager
  if (req.currentUser.role === 'agency_manager') {
    const branchIds = req.currentUser.branchIds || [];
    if (branchIds.length === 0) {
      // Agent with no branches: no bookings visible
      return paginatedResponse(res, [], getPaginationMeta(page, limit, 0), 'Bookings retrieved successfully');
    }
    conditions.push({
      $or: [
        { pickupBranch: { $in: branchIds } },
        { returnBranch: { $in: branchIds } }
      ]
    });
  }

  // Optional filters from query string
  if (req.query.status) {
    const validStatuses = ['pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(req.query.status)) {
      return badRequestResponse(res, 'Invalid booking status');
    }
    filter.status = req.query.status;
  }

  if (req.query.branchId) {
    if (!mongoose.isValidObjectId(req.query.branchId)) {
      return badRequestResponse(res, 'Invalid branch ID');
    }
    if (req.currentUser.role === 'agency_manager') {
      const branchIds = req.currentUser.branchIds || [];
      if (!branchIds.some((id) => String(id) === String(req.query.branchId))) {
        return badRequestResponse(res, 'Branch outside your scope');
      }
    }
    conditions.push({ $or: [{ pickupBranch: req.query.branchId }, { returnBranch: req.query.branchId }] });
  }

  if (req.query.dateFrom || req.query.dateTo) {
    filter.startAt = {};
    if (req.query.dateFrom) {
      const from = new Date(req.query.dateFrom);
      if (Number.isNaN(from.getTime())) {
        return badRequestResponse(res, 'Invalid start date');
      }
      filter.startAt.$gte = from;
    }
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo);
      if (Number.isNaN(to.getTime())) {
        return badRequestResponse(res, 'Invalid end date');
      }
      filter.startAt.$lte = to;
    }
  }

  if (req.query.search) {
    const searchTerm = String(req.query.search).trim();
    if (searchTerm.length === 0) {
      // ignore empty search
    } else if (searchTerm.length > 60) {
      return badRequestResponse(res, 'Search term too long');
    } else {
      const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
      conditions.push({ notes: searchRegex });
    }
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  // Fetch paginated bookings + total in parallel
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('customer', 'name email')
      .populate('vehicle', 'make model registrationNumber')
      .populate('pickupBranch', 'name code')
      .populate('returnBranch', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter)
  ]);

  return paginatedResponse(res, bookings, getPaginationMeta(page, limit, total), 'Bookings retrieved successfully');
});

module.exports = { getAgentBookings };

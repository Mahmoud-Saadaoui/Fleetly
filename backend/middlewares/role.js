const User = require('../models/user');
const logger = require('../utils/logger');
const { forbiddenResponse } = require('../utils/apiResponse');

const authorize = (...allowedRoles) => async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('_id role isAdmin branchIds').lean();
    if (!user) return forbiddenResponse(res, 'User not found');

    // isAdmin is kept during migration so existing administrators are not locked out.
    const role = user.isAdmin ? 'admin' : (user.role || 'user');
    req.currentUser = { ...user, role };

    if (!allowedRoles.includes(role)) {
      logger.warn('Role check failed', { userId: req.userId, role, path: req.path });
      return forbiddenResponse(res, 'Insufficient permissions');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { authorize };

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate } = require('../middlewares/validate');
const userAdminRules = require('../validators/userAdminValidator');
const {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  inviteUser
} = require('../controllers/userAdminController');

// User list (admin, fleet_manager)
router.get(
  '/',
  auth.check,
  authorize('admin', 'agency_manager'),
  listUsers
);

// User details (admin, fleet_manager)
router.get(
  '/:id',
  auth.check,
  authorize('admin', 'agency_manager'),
  getUserById
);

// Update user (admin only)
router.patch(
  '/:id',
  auth.check,
  authorize('admin'),
  userAdminRules.update,
  validate,
  updateUser
);

// Delete user (admin only)
router.delete(
  '/:id',
  auth.check,
  authorize('admin'),
  deleteUser
);

// Invite new user (admin, fleet_manager)
router.post(
  '/invite',
  auth.check,
  authorize('admin', 'agency_manager'),
  userAdminRules.invite,
  validate,
  inviteUser
);

module.exports = router;

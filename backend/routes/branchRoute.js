const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate } = require('../middlewares/validate');
const branchRules = require('../validators/branchValidator');
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch
} = require('../controllers/branchController');

// Public routes: the vehicle catalogue and detail pages list agencies and let
// anonymous visitors filter/select them, so no authentication is required here.
router.get('/', getBranches);
router.get('/:id', getBranchById);

// Admin/fleet_manager routes
router.post(
  '/',
  auth.check,
  authorize('admin', 'agency_manager'),
  branchRules.create,
  validate,
  createBranch
);

router.patch(
  '/:id',
  auth.check,
  authorize('admin', 'agency_manager'),
  branchRules.update,
  validate,
  updateBranch
);

// Delete: admin only
router.delete(
  '/:id',
  auth.check,
  authorize('admin'),
  deleteBranch
);

module.exports = router;

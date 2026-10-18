const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate } = require('../middlewares/validate');
const vehicleRules = require('../validators/vehicleValidator');
const {
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleAdminController');

// Update vehicle (admin, fleet_manager)
router.patch(
  '/:id',
  auth.check,
  authorize('admin', 'agency_manager'),
  vehicleRules.update,
  validate,
  updateVehicle
);

// Delete vehicle (admin, fleet_manager)
router.delete(
  '/:id',
  auth.check,
  authorize('admin', 'agency_manager'),
  deleteVehicle
);

module.exports = router;

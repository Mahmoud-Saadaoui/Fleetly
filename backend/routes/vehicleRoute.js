const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const validate = require('../middlewares/validate');
const vehicleRules = require('../validators/vehicleValidator');
const { getVehicles, getVehicleById, getVehicleAvailability, createVehicle, updateVehicleStatus } = require('../controllers/vehicleController');

// Public routes
router.get('/', getVehicles);
// Declared before '/:id' so 'availability' is not captured as an id.
router.get('/:id/availability', getVehicleAvailability);
router.get('/:id', getVehicleById);

router.post('/', auth.check, authorize('admin', 'agency_manager'), vehicleRules.create, validate, createVehicle);
router.patch('/:id/status', auth.check, authorize('admin', 'agency_manager'), updateVehicleStatus);

module.exports = router;

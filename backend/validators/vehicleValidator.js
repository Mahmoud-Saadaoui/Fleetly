const { body } = require('express-validator');

/**
 * Validation rules for vehicle editing/creation
 */
const vehicleRules = {
  create: [
    body('make')
      .notEmpty().withMessage('Make is required')
      .trim()
      .isLength({ max: 60 }).withMessage('Make cannot exceed 60 characters'),
    body('model')
      .notEmpty().withMessage('Model is required')
      .trim()
      .isLength({ max: 80 }).withMessage('Model cannot exceed 80 characters'),
    body('category')
      .optional()
      .isIn(['Premium', 'Sport', 'Business', 'Électrique', 'SUV', 'Citadine'])
      .withMessage('Invalid category'),
    body('registrationNumber')
      .notEmpty().withMessage('Registration number is required')
      .trim()
      .isLength({ max: 20 }).withMessage('Registration number cannot exceed 20 characters'),
    body('vin')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 17 }).withMessage('VIN cannot exceed 17 characters'),
    body('branch')
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId().withMessage('Branch ID must be a valid ObjectId'),
    body('location')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 120 }).withMessage('Location cannot exceed 120 characters'),
    body('dailyRateCents')
      .notEmpty().withMessage('Daily rate is required')
      .isInt({ min: 0 }).withMessage('Daily rate must be a positive integer'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter ISO code'),
    body('seats')
      .optional()
      .isInt({ min: 1, max: 20 }).withMessage('Seats must be between 1 and 20'),
    body('transmission')
      .optional()
      .isIn(['Automatique', 'Manuelle']).withMessage('Invalid transmission'),
    body('fuelType')
      .optional()
      .isIn(['Essence', 'Diesel', 'Hybride', 'Électrique']).withMessage('Invalid fuel type'),
    body('mileage')
      .optional()
      .isInt({ min: 0 }).withMessage('Mileage must be a positive integer'),
    body('images')
      .optional()
      .isArray().withMessage('Images must be an array'),
    body('images.*')
      .optional()
      .isString().withMessage('Each image must be a URL string')
      .trim()
      .isLength({ max: 2048 }).withMessage('Image URL cannot exceed 2048 characters'),
    body('status')
      .optional()
      .isIn(['available', 'reserved', 'rented', 'maintenance', 'retired'])
      .withMessage('Invalid status'),
    body('ownershipCostCentsPerDay')
      .optional()
      .isInt({ min: 0 }).withMessage('Ownership cost must be a positive integer'),
    body('maintenanceCostCents')
      .optional()
      .isInt({ min: 0 }).withMessage('Maintenance cost must be a positive integer')
  ],
  update: [
    body('make')
      .optional()
      .notEmpty().withMessage('Make cannot be empty')
      .trim()
      .isLength({ max: 60 }).withMessage('Make cannot exceed 60 characters'),
    body('model')
      .optional()
      .notEmpty().withMessage('Model cannot be empty')
      .trim()
      .isLength({ max: 80 }).withMessage('Model cannot exceed 80 characters'),
    body('category')
      .optional()
      .isIn(['Premium', 'Sport', 'Business', 'Électrique', 'SUV', 'Citadine'])
      .withMessage('Invalid category'),
    body('registrationNumber')
      .optional()
      .notEmpty().withMessage('Registration number cannot be empty')
      .trim()
      .isLength({ max: 20 }).withMessage('Registration number cannot exceed 20 characters'),
    body('vin')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 17 }).withMessage('VIN cannot exceed 17 characters'),
    body('branch')
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId().withMessage('Branch ID must be a valid ObjectId'),
    body('location')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 120 }).withMessage('Location cannot exceed 120 characters'),
    body('dailyRateCents')
      .optional()
      .isInt({ min: 0 }).withMessage('Daily rate must be a positive integer'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter ISO code'),
    body('seats')
      .optional()
      .isInt({ min: 1, max: 20 }).withMessage('Seats must be between 1 and 20'),
    body('transmission')
      .optional()
      .isIn(['Automatique', 'Manuelle']).withMessage('Invalid transmission'),
    body('fuelType')
      .optional()
      .isIn(['Essence', 'Diesel', 'Hybride', 'Électrique']).withMessage('Invalid fuel type'),
    body('mileage')
      .optional()
      .isInt({ min: 0 }).withMessage('Mileage must be a positive integer'),
    body('images')
      .optional()
      .isArray().withMessage('Images must be an array'),
    body('images.*')
      .optional()
      .isString().withMessage('Each image must be a URL string')
      .trim()
      .isLength({ max: 2048 }).withMessage('Image URL cannot exceed 2048 characters'),
    body('status')
      .optional()
      .isIn(['available', 'reserved', 'rented', 'maintenance', 'retired'])
      .withMessage('Invalid status'),
    body('ownershipCostCentsPerDay')
      .optional()
      .isInt({ min: 0 }).withMessage('Ownership cost must be a positive integer'),
    body('maintenanceCostCents')
      .optional()
      .isInt({ min: 0 }).withMessage('Maintenance cost must be a positive integer')
  ]
};

module.exports = vehicleRules;

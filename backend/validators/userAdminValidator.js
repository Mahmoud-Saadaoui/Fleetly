const { body } = require('express-validator');

/**
 * Validation rules for admin user management
 */
const userAdminRules = {
  update: [
    body('role')
      .optional()
      .isIn(['user', 'agency_manager', 'admin'])
      .withMessage('Invalid role'),
    body('branchIds')
      .optional()
      .isArray().withMessage('branchIds must be an array'),
    body('branchIds.*')
      .optional()
      .isMongoId().withMessage('Each branchId must be a valid ObjectId'),
    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive must be a boolean')
  ],

  invite: [
    body('name')
      .notEmpty().withMessage('Name is required')
      .trim()
      .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Email must be valid')
      .normalizeEmail(),
    body('role')
      .optional()
      .isIn(['user', 'agency_manager', 'admin'])
      .withMessage('Invalid role'),
    body('branchIds')
      .optional()
      .isArray().withMessage('branchIds must be an array'),
    body('branchIds.*')
      .optional()
      .isMongoId().withMessage('Each branchId must be a valid ObjectId')
  ]
};

module.exports = userAdminRules;

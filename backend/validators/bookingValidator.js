const { body } = require('express-validator');

const bookingRules = {
  create: [
    body('vehicleId')
      .notEmpty().withMessage('vehicleId is required')
      .isMongoId().withMessage('vehicleId must be a valid ObjectId'),
    body('startAt')
      .notEmpty().withMessage('startAt is required')
      .isISO8601().withMessage('startAt must be a valid date'),
    body('endAt')
      .notEmpty().withMessage('endAt is required')
      .isISO8601().withMessage('endAt must be a valid date'),
    body('pickupBranch')
      .optional()
      .isMongoId().withMessage('pickupBranch must be a valid ObjectId'),
    body('returnBranch')
      .optional()
      .isMongoId().withMessage('returnBranch must be a valid ObjectId'),
    body('idempotencyKey')
      .optional()
      .trim()
      .isLength({ min: 1, max: 128 }).withMessage('idempotencyKey must be between 1 and 128 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('notes cannot exceed 1000 characters')
  ],
  quote: [
    body('vehicleId')
      .notEmpty().withMessage('vehicleId is required')
      .isMongoId().withMessage('vehicleId must be a valid ObjectId'),
    body('startAt')
      .notEmpty().withMessage('startAt is required')
      .isISO8601().withMessage('startAt must be a valid date'),
    body('endAt')
      .notEmpty().withMessage('endAt is required')
      .isISO8601().withMessage('endAt must be a valid date')
  ]
};

module.exports = bookingRules;

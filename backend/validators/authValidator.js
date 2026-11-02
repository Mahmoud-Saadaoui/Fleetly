const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email too long')
    .escape(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 50 }).withMessage('Password must be between 6 and 50 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .escape(),
  // Passwords are opaque values: trimming here would change the password.
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

const invitationValidation = [
  body('token')
    .isHexadecimal().withMessage('Invitation token is invalid')
    .isLength({ min: 64, max: 64 }).withMessage('Invitation token is invalid'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 50 }).withMessage('Password must be between 6 and 50 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  invitationValidation
};

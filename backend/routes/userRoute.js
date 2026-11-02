const express = require('express');
const {
  registerUser,
  loginUser,
  getMe,
  acceptInvitation,
} = require("../controllers/userController");
const router = express.Router();
const auth = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { registerValidation, loginValidation, invitationValidation } = require('../validators/authValidator');

//  api/users/register
router.post('/register', authLimiter, registerValidation, registerUser)

//  api/users/login
router.post('/login', authLimiter, loginValidation, loginUser)

// api/users/accept-invitation
router.post('/accept-invitation', authLimiter, invitationValidation, acceptInvitation)

//  api/users/me
router.get('/me', auth.check, getMe)


module.exports = router;

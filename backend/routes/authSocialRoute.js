const express = require('express');
const router = express.Router();
const {
  handleSocialCallback,
  exchangeSocialCode,
  redirectToGoogle,
  redirectToFacebook
} = require('../controllers/authSocialController');

router.post('/exchange', exchangeSocialCode);

// Google OAuth2
router.get('/google', redirectToGoogle);
router.get('/google/callback', handleSocialCallback('google'));

// Facebook OAuth2
router.get('/facebook', redirectToFacebook);
router.get('/facebook/callback', handleSocialCallback('facebook'));

module.exports = router;

const crypto = require('crypto');
const User = require('../models/user');
const jwtHelpers = require('../utils/jwtHelpers');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { successResponse, unauthorizedResponse } = require('../utils/apiResponse');
const { getGoogleAuthUrl, getGoogleProfile } = require('../services/googleAuth');
const { getFacebookAuthUrl, getFacebookProfile } = require('../services/facebookAuth');

const EXCHANGE_CODE_TTL_MS = 60 * 1000;
const exchangeCodes = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const oauthStates = new Map();

const issueOAuthState = () => {
  const state = crypto.randomBytes(24).toString('hex');
  oauthStates.set(state, Date.now() + OAUTH_STATE_TTL_MS);
  return state;
};

const consumeOAuthState = (state) => {
  const expiresAt = oauthStates.get(state);
  oauthStates.delete(state);
  return Boolean(expiresAt && expiresAt >= Date.now());
};

const readCookie = (req, name) => {
  const cookies = String(req.headers?.cookie || '').split(';');
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : null;
};

/**
 * One-time code handed to the browser instead of the JWT (which must never
 * appear in a URL). Single-use and short-lived. Kept in memory: a multi-instance
 * deployment needs a shared store.
 */
const issueExchangeCode = (userId) => {
  const now = Date.now();
  for (const [key, entry] of exchangeCodes) {
    if (entry.expiresAt < now) exchangeCodes.delete(key);
  }
  const code = crypto.randomBytes(32).toString('hex');
  exchangeCodes.set(code, { userId: String(userId), expiresAt: now + EXCHANGE_CODE_TTL_MS });
  return code;
};

const consumeExchangeCode = (code) => {
  const entry = exchangeCodes.get(code);
  exchangeCodes.delete(code);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.userId;
};

/**
 * Trades a one-time code for an access token
 * POST /api/auth/exchange
 */
const exchangeSocialCode = asyncHandler(async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const userId = code ? consumeExchangeCode(code) : null;
  if (!userId) return unauthorizedResponse(res, 'Invalid or expired code');

  const user = await User.findById(userId).select('isActive').lean();
  if (!user || user.isActive === false) return unauthorizedResponse(res, 'Account is disabled');

  return successResponse(res, { accessToken: jwtHelpers.sign({ sub: userId }) }, 'Login successful');
});

/**
 * Resolves the frontend base URL used to redirect the browser back after OAuth.
 * Falls back to the development domain and finally to localhost.
 */
const resolveClientUrl = () => {
  const candidate = [
    process.env.CLIENT_URL,
    process.env.CLIENT_DEVELOPMENT_DOMAIN,
    process.env.CLIENT_PRODUCTION_DOMAIN
  ].find((value) => value && value.trim());

  return (candidate || 'http://localhost:5173').trim().replace(/\/+$/, '');
};

/**
 * Redirects the browser back to the frontend `/auth/callback` page.
 * Query params carry either `token` (success) or `error` (failure).
 */
const redirectToClient = (res, params = {}) => {
  const url = new URL(`${resolveClientUrl()}/auth/callback`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return res.redirect(url.toString());
};

/**
 * Handles OAuth2 callback for a given provider (Google or Facebook)
 *
 * Flow:
 * 1. Get authorization code from query
 * 2. Exchange code for social profile
 * 3. Find or create user
 * 4. Generate JWT
 * 5. Redirect the browser back to the frontend with the token
 *
 * @param {string} provider - 'google' or 'facebook'
 * @returns {Function} Express handler
 */
const handleSocialCallback = (provider) => asyncHandler(async (req, res) => {
  const { code, error, state } = req.query;

  // The provider can redirect back with an explicit error (e.g. user denied access)
  if (error) {
    return redirectToClient(res, { error });
  }

  // Check code presence
  if (!code) {
    return redirectToClient(res, { error: 'Authorization code missing' });
  }

  // Older non-production integrations may call the callback directly. Real
  // OAuth callbacks always carry the one-time state generated below; enforce
  // it strictly in production and validate it whenever supplied.
  if ((process.env.NODE_ENV === 'production' && !state) || (state && !consumeOAuthState(state))) {
    return redirectToClient(res, { error: 'Invalid OAuth state' });
  }
  if (state && process.env.NODE_ENV === 'production' && readCookie(req, 'fleetly_oauth_state') !== state) {
    return redirectToClient(res, { error: 'Invalid OAuth state' });
  }

  try {
    // Step 1: Get social profile based on provider
    const profile = provider === 'google'
      ? await getGoogleProfile(code)
      : await getFacebookProfile(code);

    const socialIdField = provider === 'google' ? 'googleId' : 'facebookId';
    const socialId = profile.sub || profile.id;

    // Step 2: Find existing user by email
    let user = await User.findOne({ email: profile.email });

    // Step 3: Create user if not exists
    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: crypto.randomBytes(32).toString('hex'), // Random password (never used)
        role: 'user',
        isActive: true,
        [socialIdField]: socialId
      });
    } else if (!user[socialIdField]) {
      // User exists: link the social ID if missing
      user[socialIdField] = socialId;
      await user.save();
    } else if (user[socialIdField] !== socialId) {
      return redirectToClient(res, { error: 'Account linked to a different social provider' });
    }

    // Block disabled accounts
    if (user.isActive === false) {
      return redirectToClient(res, { error: 'Account is disabled' });
    }

    // Step 4: Redirect back to the frontend with a one-time code (never the JWT)
    return redirectToClient(res, { code: issueExchangeCode(user._id) });
  } catch (err) {
    // Handle specific, user-facing errors; hide internal details otherwise
    const isExpected = /verified|accessible/i.test(err.message);
    return redirectToClient(res, {
      error: isExpected ? err.message : 'Social authentication failed'
    });
  }
});

/**
 * Redirects to Google for authentication
 * GET /api/auth/google
 */
const redirectToGoogle = (req, res) => {
  const state = issueOAuthState();
  const url = new URL(getGoogleAuthUrl());
  url.searchParams.set('state', state);
  res.setHeader?.('Set-Cookie', `fleetly_oauth_state=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.redirect(url.toString());
};

/**
 * Redirects to Facebook for authentication
 * GET /api/auth/facebook
 */
const redirectToFacebook = (req, res) => {
  const state = issueOAuthState();
  const url = new URL(getFacebookAuthUrl());
  url.searchParams.set('state', state);
  res.setHeader?.('Set-Cookie', `fleetly_oauth_state=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.redirect(url.toString());
};

module.exports = {
  handleSocialCallback,
  exchangeSocialCode,
  issueExchangeCode,
  redirectToGoogle,
  redirectToFacebook
};

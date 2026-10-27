const requiredVariables = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN'
];

const validateInteger = (name, { min, max }) => {
  if (!process.env[name]) {
    return;
  }

  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
};

const validateEnv = () => {
  const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }

  const nodeEnvironments = new Set(['development', 'test', 'production']);
  if (process.env.NODE_ENV && !nodeEnvironments.has(process.env.NODE_ENV)) {
    throw new Error('NODE_ENV must be development, test or production');
  }

  validateInteger('PORT', { min: 1, max: 65535 });
  validateInteger('TRUST_PROXY_HOPS', { min: 0, max: 10 });
  validateInteger('MONGO_MAX_POOL_SIZE', { min: 1, max: 500 });

  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_PRODUCTION_DOMAIN?.trim()) {
    throw new Error('CLIENT_PRODUCTION_DOMAIN is required in production');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CLIENT_ALLOWED_ORIGINS?.trim() && !process.env.CLIENT_PRODUCTION_DOMAIN?.trim()) {
      throw new Error('CLIENT_ALLOWED_ORIGINS or CLIENT_PRODUCTION_DOMAIN is required in production');
    }
    if (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_SECRET) {
      if (!process.env.GOOGLE_CALLBACK_URL?.trim()) throw new Error('GOOGLE_CALLBACK_URL is required in production when Google OAuth is configured');
    }
    if (process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_SECRET) {
      if (!process.env.FACEBOOK_CALLBACK_URL?.trim()) throw new Error('FACEBOOK_CALLBACK_URL is required in production when Facebook OAuth is configured');
    }
  }

  if (process.env.BCRYPT_ROUNDS) {
    const rounds = Number(process.env.BCRYPT_ROUNDS);
    if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
      throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15');
    }
  }

  // Google OAuth validation (if configured)
  if (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_SECRET) {
    if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
      throw new Error('GOOGLE_CLIENT_ID is required when Google OAuth is configured');
    }
    if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) {
      throw new Error('GOOGLE_CLIENT_SECRET is required when Google OAuth is configured');
    }
  }

  // Facebook OAuth validation (if configured)
  if (process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_SECRET) {
    if (!process.env.FACEBOOK_APP_ID?.trim()) {
      throw new Error('FACEBOOK_APP_ID is required when Facebook OAuth is configured');
    }
    if (!process.env.FACEBOOK_APP_SECRET?.trim()) {
      throw new Error('FACEBOOK_APP_SECRET is required when Facebook OAuth is configured');
    }
  }
};

module.exports = { validateEnv };

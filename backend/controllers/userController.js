const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwtHelpers = require('../utils/jwtHelpers');
const { asyncHandler } = require('../middlewares/asyncHandler');
const {
  createdResponse,
  successResponse,
  conflictResponse,
  notFoundResponse,
  unauthorizedResponse
} = require('../utils/apiResponse');

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await User.exists({ email });

  if (existingUser) {
    return conflictResponse(res, 'User already exists');
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

    return createdResponse(res, {
      id: user.id,
      name: user.name,
      isAdmin: user.isAdmin,
      role: user.isAdmin ? 'admin' : user.role,
    accessToken: jwtHelpers.sign({ sub: user.id })
  }, 'User registered successfully');
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const isPasswordValid = user && await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  if (user.isActive === false) {
    return unauthorizedResponse(res, 'Account is disabled');
  }

  return successResponse(res, {
    id: user.id,
    name: user.name,
    isAdmin: user.isAdmin,
    role: user.isAdmin ? 'admin' : user.role,
    accessToken: jwtHelpers.sign({ sub: user.id })
  }, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
    .select('name email isAdmin role branchIds isActive')
    .lean();

  if (!user || user.isActive === false) {
    return notFoundResponse(res, 'User');
  }

  return successResponse(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    role: user.isAdmin ? 'admin' : user.role,
    branchIds: user.branchIds
  }, 'User retrieved successfully');
});

module.exports = {
  registerUser,
  loginUser,
  getMe
};

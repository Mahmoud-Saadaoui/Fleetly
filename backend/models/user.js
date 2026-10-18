const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Name is required'],
		maxlength: [50, 'Name cannot exceed 50 characters'],
		trim: true
	},
	email: {
		type: String,
		required: [true, 'Email is required'],
		unique: true,
		trim: true,
		lowercase: true,
		index: true
	},
	password: {
		type: String,
		required: [true, 'Password is required'],
		minlength: [6, 'Password must be at least 6 characters'],
		select: false
	},
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'agency_manager', 'admin'],
    default: 'user',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  googleId: { type: String, sparse: true, unique: true },
  facebookId: { type: String, sparse: true, unique: true }
}, {
	timestamps: true
})

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel

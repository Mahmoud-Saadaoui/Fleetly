const mongoose = require('mongoose');

/**
 * Branch Model
 * 
 * Represents a physical vehicle rental agency.
 * Referenced by: User (branchIds), Vehicle (branch), Booking (pickupBranch, returnBranch)
 */
const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Branch code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [2, 'Code must be at least 2 characters'],
    maxlength: [10, 'Code cannot exceed 10 characters']
  },
  address: {
    street: { type: String, trim: true, maxlength: 200 },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: 100
    },
    postalCode: { type: String, trim: true, maxlength: 20 },
    country: { type: String, default: 'FR', trim: true, uppercase: true, maxlength: 2 }
  },
  phone: { type: String, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true, maxlength: 100 },
  isActive: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

// Index for city search
BranchSchema.index({ 'address.city': 1 });

// Transform _id to id in JSON responses
BranchSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Branch', BranchSchema);

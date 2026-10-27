const mongoose = require('mongoose');
const { canTransition } = require('../utils/bookingStateMachine');

const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'active'];

const BookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  pickupBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  returnBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  startAt: { type: Date, required: true, index: true },
  endAt: {
    type: Date,
    required: true,
    index: true,
    validate: {
      validator(value) { return value > this.startAt; },
      message: 'Return date must be after pickup date'
    }
  },
  pricing: {
    dailyRateCents: { type: Number, required: true, min: 0 },
    rentalDays: { type: Number, required: true, min: 1 },
    subtotalCents: { type: Number, required: true, min: 0 },
    extrasCents: { type: Number, default: 0, min: 0 },
    discountCents: { type: Number, default: 0, min: 0 },
    taxCents: { type: Number, default: 0, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR', uppercase: true, minlength: 3, maxlength: 3 }
  },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'],
    default: 'pending_payment',
    index: true
  },
  paymentStatus: { type: String, enum: ['pending', 'authorized', 'paid', 'refunded', 'failed'], default: 'pending' },
  expiresAt: { type: Date, index: true },
  idempotencyKey: { type: String, trim: true, maxlength: 128, select: false },
  notes: { type: String, trim: true, maxlength: 1000 },
  checkIn: { completedAt: Date, mileage: Number, fuelLevel: Number, photos: [String], signatureUrl: String },
  checkOut: { completedAt: Date, mileage: Number, fuelLevel: Number, photos: [String], damageNotes: String },
  cancelledAt: Date,
  cancellationReason: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

BookingSchema.index({ customer: 1, status: 1, createdAt: -1 });
BookingSchema.index({ vehicle: 1, status: 1, startAt: 1, endAt: 1 });
BookingSchema.index({ customer: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
BookingSchema.statics.activeStatuses = ACTIVE_STATUSES;

BookingSchema.post('init', function () {
  this.$locals.originalStatus = this.status;
});

BookingSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('status')) {
    const originalStatus = this.$locals.originalStatus;
    if (!originalStatus || !canTransition(originalStatus, this.status)) {
      const err = new Error(`Invalid booking status transition from ${originalStatus || 'unknown'} to ${this.status}`);
      err.name = 'ValidationError';
      return next(err);
    }
  }
  next();
});

BookingSchema.post('save', function () {
  this.$locals.originalStatus = this.status;
});

BookingSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Booking', BookingSchema);

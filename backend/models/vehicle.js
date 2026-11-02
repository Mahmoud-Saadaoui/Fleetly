const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 80 },
    category: {
      type: String,
      enum: ["Premium", "Sport", "Business", "Électrique", "SUV", "Citadine"],
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vin: { type: String, trim: true, uppercase: true },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      index: true,
    },
    location: { type: String, trim: true, maxlength: 120 },
    dailyRateCents: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      default: "EUR",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    seats: { type: Number, required: true, min: 1, max: 20 },
    transmission: {
      type: String,
      enum: ["Automatique", "Manuelle"],
      required: true,
    },
    fuelType: {
      type: String,
      enum: ["Essence", "Diesel", "Hybride", "Électrique"],
      required: true,
    },
    mileage: { type: Number, default: 0, min: 0 },
    bookingVersion: { type: Number, default: 0, min: 0 },
    images: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["available", "reserved", "rented", "maintenance", "retired"],
      default: "available",
      index: true,
    },
    ownershipCostCentsPerDay: { type: Number, default: 0, min: 0 },
    maintenanceCostCents: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

VehicleSchema.virtual("name").get(function name() {
  return `${this.make} ${this.model}`;
});

VehicleSchema.set("toJSON", { virtuals: true, versionKey: false });
VehicleSchema.index({ isDeleted: 1, status: 1, category: 1 });
VehicleSchema.index({ registrationNumber: 1 }, { unique: true });
VehicleSchema.index({ vin: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Vehicle", VehicleSchema);
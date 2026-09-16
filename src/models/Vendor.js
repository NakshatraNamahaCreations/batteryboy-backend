const mongoose = require('mongoose');

// Technician / roadside-assistance partner.
const vendorSchema = new mongoose.Schema(
  {
    // Empty right after self-registration (see vendorAuthController.sendOtp)
    // — the partner app treats an empty name as "profile setup not done yet"
    // and routes to the registration screen before Home.
    name: { type: String, default: '' },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: '' },
    city: { type: String, default: '' },
    vendorType: {
      type: String,
      enum: ['battery_technician', 'mechanic', 'puncture_technician', 'towing_provider', 'multi_service'],
      default: 'multi_service',
    },
    skills: { type: [String], default: [] },
    serviceAreas: { type: [String], default: [] },
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    online: { type: Boolean, default: false },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    completedJobs: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    // GeoJSON Point [lng, lat], updated by the partner app every ~15-20s while online.
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    lastLocationAt: { type: Date, default: null },
    // Mock OTP login, mirrors User — see server/src/utils/otp.js.
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

vendorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Vendor', vendorSchema);

const mongoose = require('mongoose');

// Technician / roadside-assistance partner. Full dispatch/live-location
// fields are left for a later phase — this covers what the admin MVP needs:
// onboarding, verification, and a directory to browse/search.
const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
  },
  { timestamps: true },
);

module.exports = mongoose.model('Vendor', vendorSchema);

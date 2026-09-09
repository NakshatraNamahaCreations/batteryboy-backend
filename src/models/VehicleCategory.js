const mongoose = require('mongoose');

// Vehicle type shown on the "Select your vehicle" screen, e.g. "Two Wheeler",
// "Four Wheeler", "EV Batteries". `key` is the stable slug the app already
// uses (two_wheeler, four_wheeler, ...).
const vehicleCategorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: 'car-outline' },
    movingVehicle: { type: Boolean, default: true }, // eligible for jumpstart/towing
    evCapable: { type: Boolean, default: false }, // eligible for Mobile EV Charging
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('VehicleCategory', vehicleCategorySchema);

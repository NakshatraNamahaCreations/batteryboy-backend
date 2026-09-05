const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    registration: { type: String, default: '' },
    category: { type: String, required: true },
    fuel: { type: String, default: '' },
    year: { type: Number, default: null },
    batteryAh: { type: Number, default: null },
    health: { type: Number, default: 100, min: 0, max: 100 },
    lastChecked: { type: String, default: '' },
    primary: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Vehicle', vehicleSchema);

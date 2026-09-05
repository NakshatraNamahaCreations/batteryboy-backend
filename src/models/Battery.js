const mongoose = require('mongoose');

const batterySchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    model: { type: String, required: true },
    capacityAh: { type: Number, required: true },
    voltage: { type: Number, default: 12 },
    crankingAmps: { type: Number, default: null },
    warrantyMonths: { type: Number, required: true },
    price: { type: Number, required: true },
    dimensions: { type: String, default: '' },
    terminal: { type: String, default: '' },
    recommended: { type: Boolean, default: false },
    image: { type: String, default: '' },
    category: { type: String, default: 'four_wheeler', index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Battery', batterySchema);

const mongoose = require('mongoose');

// A bookable service under a category, e.g. Category "Battery Services" ->
// Service "Jump Start" (base price 249, ~20 min, car+bike).
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'construct-outline' },
    basePrice: { type: Number, required: true, min: 0 },
    estimatedDurationMins: { type: Number, default: 30 },
    vehicleTypes: { type: [String], enum: ['car', 'bike', 'both'], default: ['both'] },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Service', serviceSchema);

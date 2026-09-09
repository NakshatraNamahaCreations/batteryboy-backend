const mongoose = require('mongoose');

// Service Categories, e.g. "Battery Services", "Tyre Services", "Towing Services".
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, default: 'battery-charging-outline' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Category', categorySchema);

const mongoose = require('mongoose');
const { SOS_FIX_ACTIONS } = require('../seed/sosDefaults');

// Step 2 of Roadside SOS: "Choose your fix". `action` decides step 3 — what
// the app does when the customer confirms — and maps to flows built into
// the app, so only these values are allowed.
const sosFixSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    action: { type: String, enum: SOS_FIX_ACTIONS, required: true },
    etaMins: { type: Number, default: null, min: 0 },
    priceLine: { type: String, default: '', trim: true },
    // Display price. Ignored for jumpstart_order — the app shows the real
    // order total (service price + call-out + GST) instead.
    price: { type: Number, default: null, min: 0 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SosFix', sosFixSchema);

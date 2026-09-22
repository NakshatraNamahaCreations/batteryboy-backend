const mongoose = require('mongoose');

// Third-party partner directory shown on the customer app's Puncture Shop
// and Emergency Towing screens — NOT Battery Boy's own dispatched Vendors
// (those receive real bookings via the ring dispatch engine, see
// services/dispatch.js). These are just a directory: the customer calls or
// requests directly, and the work/pricing/guarantee are the partner's own.
const partnerBusinessSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['puncture', 'towing'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    priceFrom: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    // Only meaningful for 'puncture' (the "Open now" filter on that screen);
    // towing is always presented as available.
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PartnerBusiness', partnerBusinessSchema);

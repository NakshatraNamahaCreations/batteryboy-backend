const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0 },
    callout: { type: Number, default: 0 },
    install: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxable: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    services: { type: [String], required: true },
    serviceLabel: { type: String, required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    vehicleLabel: { type: String, default: '' },
    batteryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Battery', default: null },
    batteryLabel: { type: String, default: '' },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', default: null },
    addressLabel: { type: String, default: '' },
    date: { type: String, default: '' },
    slotId: { type: String, default: '' },
    slot: { type: String, default: '' },
    night: { type: Boolean, default: false },
    couponCode: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    pricing: { type: pricingSchema, default: () => ({}) },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'on_way', 'arrived', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    invoiceNo: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', orderSchema);

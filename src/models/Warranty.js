const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    vehicleLabel: { type: String, default: '' },
    purchasedOn: { type: String, required: true },
    expiresOn: { type: String, required: true },
    daysLeft: { type: Number, default: 0 },
    percentLeft: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'expiring', 'expired'], default: 'active' },
    freeReplacementMonths: { type: Number, default: 24 },
    proRataMonths: { type: Number, default: 24 },
    invoiceNo: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Warranty', warrantySchema);

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    icon: { type: String, default: 'location' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Address', addressSchema);

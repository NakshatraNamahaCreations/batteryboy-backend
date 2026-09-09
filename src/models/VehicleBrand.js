const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({ name: { type: String, required: true }, order: { type: Number, default: 0 } }, { _id: false });

// A brand under a vehicle category, e.g. Category "Two Wheeler" -> Brand
// "Hero" -> models ["Splendor Plus", "Passion Pro", ...]. `evOnly` brands
// only show up when the customer is booking Mobile EV Charging.
const vehicleBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleCategory', required: true, index: true },
    logoDomain: { type: String, default: '' }, // e.g. "heromotocorp.com" — used to fetch a brand logo
    evOnly: { type: Boolean, default: false },
    models: { type: [modelSchema], default: [] },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('VehicleBrand', vehicleBrandSchema);

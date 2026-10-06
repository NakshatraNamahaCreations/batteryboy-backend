const mongoose = require('mongoose');

// Small admin-editable key/value settings (e.g. towing rates).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Setting', settingSchema);

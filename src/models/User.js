const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    city: { type: String, default: '' },
    referralCode: { type: String, default: '' },
    primaryVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    // Mock-OTP fields — a real SMS provider would replace this with a hashed,
    // short-lived code instead of storing it in plain text on the user doc.
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);

const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const { generateOtp, isOtpValid } = require('../utils/otp');
const { asyncHandler } = require('../utils/asyncHandler');

function signToken(vendor) {
  return jwt.sign({ sub: vendor._id.toString(), isVendor: true }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function serializeVendor(vendor) {
  return {
    id: vendor._id,
    name: vendor.name,
    phone: vendor.phone,
    email: vendor.email,
    city: vendor.city,
    vendorType: vendor.vendorType,
    verified: vendor.verified,
    active: vendor.active,
    online: vendor.online,
    rating: vendor.rating,
    completedJobs: vendor.completedJobs,
  };
}

// POST /api/vendor/auth/send-otp { phone }
// Rapido-style self-registration: a new phone number gets a bare account
// (empty name, unverified, inactive for dispatch) instead of a 404 — the
// partner app then routes them through a one-time profile-completion screen
// after OTP verification. They can browse the app immediately, but
// dispatch.findNearbyVendorIds only offers jobs to `verified: true`
// partners, so an admin still has to approve them (Vendors page) before
// they receive real bookings.
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.trim()) return res.status(400).json({ message: 'phone is required' });

  let vendor = await Vendor.findOne({ phone: phone.trim() });
  if (!vendor) {
    vendor = await Vendor.create({ phone: phone.trim() });
  }

  const { code, expiresAt } = generateOtp();
  vendor.otpCode = code;
  vendor.otpExpiresAt = expiresAt;
  await vendor.save();

  console.log(`[mock-otp] partner ${vendor.phone} -> ${code} (expires ${expiresAt.toISOString()})`);
  res.json({ success: true, devOtp: code });
});

// POST /api/vendor/auth/verify-otp { phone, otp }
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: 'phone and otp are required' });

  const vendor = await Vendor.findOne({ phone: phone.trim() });
  if (!vendor || !isOtpValid(vendor, otp)) {
    return res.status(401).json({ message: 'Invalid or expired OTP' });
  }

  vendor.otpCode = null;
  vendor.otpExpiresAt = null;
  await vendor.save();

  const token = signToken(vendor);
  res.json({ token, vendor: serializeVendor(vendor) });
});

module.exports = { sendOtp, verifyOtp, serializeVendor };

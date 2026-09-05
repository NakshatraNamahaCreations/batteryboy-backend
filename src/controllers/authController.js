const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOtp, isOtpValid } = require('../utils/otp');
const { asyncHandler } = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function serializeUser(user) {
  return {
    id: user._id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    city: user.city,
    referralCode: user.referralCode,
    primaryVehicleId: user.primaryVehicleId,
  };
}

// POST /api/auth/send-otp { phone }
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'phone is required' });
  }

  const { code, expiresAt } = generateOtp();
  const user = await User.findOneAndUpdate(
    { phone: phone.trim() },
    { $set: { otpCode: code, otpExpiresAt: expiresAt }, $setOnInsert: { phone: phone.trim() } },
    { upsert: true, returnDocument: 'after' },
  );

  console.log(`[mock-otp] ${user.phone} -> ${code} (expires ${expiresAt.toISOString()})`);

  // Mock provider: the code is returned in the response so the app is
  // testable end-to-end with no SMS account. Remove `devOtp` once a real
  // SMS provider (Twilio/MSG91) is wired in.
  res.json({ success: true, devOtp: code });
});

// POST /api/auth/verify-otp { phone, otp }
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ message: 'phone and otp are required' });
  }

  const user = await User.findOne({ phone: phone.trim() });
  if (!user || !isOtpValid(user, otp)) {
    return res.status(401).json({ message: 'Invalid or expired OTP' });
  }

  user.otpCode = null;
  user.otpExpiresAt = null;
  await user.save();

  const token = signToken(user);
  res.json({ token, user: serializeUser(user) });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: serializeUser(user) });
});

module.exports = { sendOtp, verifyOtp, me, serializeUser };

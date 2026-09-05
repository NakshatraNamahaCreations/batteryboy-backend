const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { serializeUser } = require('./authController');

// GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: serializeUser(user) });
});

// PATCH /api/users/me { name?, email?, city? }
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, city } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (email !== undefined) update.email = email;
  if (city !== undefined) update.city = city;

  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { returnDocument: 'after', runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: serializeUser(user) });
});

module.exports = { getMe, updateMe };

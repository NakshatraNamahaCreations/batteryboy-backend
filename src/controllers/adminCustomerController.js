const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Order = require('../models/Order');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/admin/customers?q=search
const listCustomers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) {
    const re = new RegExp(req.query.q, 'i');
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  const customers = await User.find(filter).sort({ createdAt: -1 }).select('-otpCode -otpExpiresAt');
  res.json({ customers });
});

// GET /api/admin/customers/:id
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id).select('-otpCode -otpExpiresAt');
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const [vehicles, orders] = await Promise.all([
    Vehicle.find({ userId: customer._id }),
    Order.find({ userId: customer._id }).sort({ createdAt: -1 }),
  ]);
  res.json({ customer, vehicles, orders });
});

module.exports = { listCustomers, getCustomer };

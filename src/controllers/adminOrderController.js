const Order = require('../models/Order');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/admin/bookings?status=assigned&q=search
const listBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(req.query.q, 'i');
    filter.$or = [{ invoiceNo: re }, { vehicleLabel: re }, { addressLabel: re }, { serviceLabel: re }];
  }
  const bookings = await Order.find(filter).populate('userId', 'name phone').sort({ createdAt: -1 }).limit(200);
  res.json({ bookings });
});

// GET /api/admin/bookings/:id
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Order.findById(req.params.id).populate('userId', 'name phone');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ booking });
});

// PATCH /api/admin/bookings/:id  { status? }  — manual admin override
const updateBooking = asyncHandler(async (req, res) => {
  const editable = ['status', 'date', 'slot'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  const booking = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).populate(
    'userId',
    'name phone',
  );
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ booking });
});

module.exports = { listBookings, getBooking, updateBooking };

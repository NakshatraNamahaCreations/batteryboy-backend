const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Address = require('../models/Address');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/admin/bookings?status=assigned&q=search
const listBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(req.query.q, 'i');
    filter.$or = [{ invoiceNo: re }, { vehicleLabel: re }, { addressLabel: re }, { serviceLabel: re }];
  }
  const bookings = await Order.find(filter).populate('userId', 'name phone').populate('vendorId', 'name phone').sort({ createdAt: -1 }).limit(200);
  res.json({ bookings });
});

// GET /api/admin/bookings/:id
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Order.findById(req.params.id).populate('userId', 'name phone').populate('vendorId', 'name phone');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ booking });
});

// GET /api/admin/bookings/:id/nearby-vendors — for manual dispatch when the
// automatic ring dispatch found nobody (spec: "No Vendor Accepted -> admin
// assigns manually"). Sorted nearest-first, no online/verified filter so the
// admin can see everyone and use judgement.
const nearbyVendorsForBooking = asyncHandler(async (req, res) => {
  const booking = await Order.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  const address = booking.addressId ? await Address.findById(booking.addressId) : null;
  if (!address?.lat || !address?.lng) return res.json({ vendors: [] });

  const vendors = await Vendor.find({
    active: true,
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [address.lng, address.lat] } },
    },
  }).limit(20);
  res.json({ vendors });
});

// PATCH /api/admin/bookings/:id  { status?, vendorId? }  — manual admin override
const updateBooking = asyncHandler(async (req, res) => {
  const editable = ['status', 'date', 'slot'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  // Manually assigning a partner also resolves the "searching" state, same
  // as if a partner had accepted the offer themselves.
  if (req.body.vendorId !== undefined) {
    update.vendorId = req.body.vendorId || null;
    if (req.body.vendorId && update.status === undefined) update.status = 'assigned';
  }
  const booking = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
    .populate('userId', 'name phone')
    .populate('vendorId', 'name phone');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ booking });
});

module.exports = { listBookings, getBooking, updateBooking, nearbyVendorsForBooking };

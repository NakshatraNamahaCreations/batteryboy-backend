const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Address = require('../models/Address');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { serviceLabel } = require('../utils/pricing');
const { makeInvoiceNo, makeServiceOtp } = require('../utils/orderCodes');

// The same 6 real services the customer app books — a manual (phone-in)
// booking must use one of these, not a free-text label, so it stays
// consistent with serviceLabel()/invoices/every other screen that reads it.
const SERVICE_CODES = ['jumpstart', 'replacement', 'install', 'check', 'scrap', 'mobile_ev'];

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

// GET /api/admin/bookings/:id — full detail view: customer, partner and
// address populated beyond the name/phone shown in the list table.
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Order.findById(req.params.id)
    .populate('userId', 'name phone email city referralCode createdAt')
    .populate('vendorId', 'name phone email city vendorType rating completedJobs verified active online')
    .populate('addressId', 'label line1 line2 lat lng');
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

// POST /api/admin/bookings — manual (phone-in) booking creation.
// { customerName, customerPhone, service, vehicleLabel, addressLabel, date, slot?, amount, vendorId? }
const createBooking = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, service, vehicleLabel, addressLabel, date, slot, amount, vendorId } = req.body;

  const phoneDigits = String(customerPhone || '').replace(/\D/g, '');
  if (!customerName?.trim()) return res.status(400).json({ message: 'Customer name is required' });
  if (phoneDigits.length !== 10) return res.status(400).json({ message: 'A valid 10-digit customer phone is required' });
  if (!SERVICE_CODES.includes(service)) return res.status(400).json({ message: 'A valid service is required' });
  if (!vehicleLabel?.trim()) return res.status(400).json({ message: 'Vehicle is required' });
  if (!addressLabel?.trim()) return res.status(400).json({ message: 'Address is required' });
  if (!date?.trim()) return res.status(400).json({ message: 'Date is required' });
  if (!(Number(amount) >= 0)) return res.status(400).json({ message: 'A valid amount is required' });

  let user = await User.findOne({ phone: phoneDigits });
  if (!user) {
    user = await User.create({ phone: phoneDigits, name: customerName.trim() });
  } else if (!user.name) {
    user.name = customerName.trim();
    await user.save();
  }

  let vendor = null;
  if (vendorId) {
    vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
  }

  const booking = await Order.create({
    userId: user._id,
    services: [service],
    serviceLabel: serviceLabel([service]),
    vehicleLabel: vehicleLabel.trim(),
    addressLabel: addressLabel.trim(),
    date: date.trim(),
    slot: slot?.trim() || '',
    amount: Number(amount),
    pricing: { total: Number(amount) },
    status: vendor ? 'assigned' : 'pending',
    vendorId: vendor?._id ?? null,
    invoiceNo: makeInvoiceNo(),
    serviceOtp: makeServiceOtp(),
  });

  const populated = await booking.populate([
    { path: 'userId', select: 'name phone' },
    { path: 'vendorId', select: 'name phone' },
  ]);
  res.status(201).json({ booking: populated });
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

module.exports = { listBookings, getBooking, createBooking, updateBooking, nearbyVendorsForBooking };

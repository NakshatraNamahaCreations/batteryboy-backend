const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Address = require('../models/Address');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { vendorTypeFilterFor, offerWaitingTowsTo, ACTIVE_JOB_STATUSES } = require('../services/dispatch');

// A partner can be (re)assigned until work starts at the spot.
const ASSIGNABLE_STATUSES = ['searching', 'pending', 'assigned', 'on_way'];

const escapeRegex = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const { applyCancellation } = require('../services/cancellation');
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
  if (req.query.refund) filter['refund.status'] = req.query.refund;
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
// GET /api/admin/bookings/:id/nearby-vendors?q= — partners the admin can
// assign: the right type for the job (towing <-> towing partners), nearest
// first when the booking has a map location, otherwise every matching
// partner (phone-in bookings have no coordinates). Each row says whether the
// partner is online, verified and already busy on another job.
const nearbyVendorsForBooking = asyncHandler(async (req, res) => {
  const booking = await Order.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  const address = booking.addressId ? await Address.findById(booking.addressId) : null;
  const hasCoords = typeof address?.lat === 'number' && typeof address?.lng === 'number';

  const filter = { active: true, vendorType: vendorTypeFilterFor(booking.services) };
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ name: re }, { phone: re }, { city: re }];
  }
  const found = hasCoords
    ? await Vendor.find({ ...filter, location: { $near: { $geometry: { type: 'Point', coordinates: [address.lng, address.lat] } } } }).limit(30)
    : await Vendor.find(filter).sort({ online: -1, verified: -1, name: 1 }).limit(50);

  const busyIds = new Set(
    (await Order.distinct('vendorId', { status: { $in: ACTIVE_JOB_STATUSES }, vendorId: { $ne: null }, _id: { $ne: booking._id } })).map(String),
  );
  const vendors = found.map((v) => {
    const [lng, lat] = v.location?.coordinates || [0, 0];
    const located = !!v.lastLocationAt && (lat || lng);
    return {
      _id: v._id,
      name: v.name,
      phone: v.phone,
      city: v.city,
      vendorType: v.vendorType,
      verified: v.verified,
      online: v.online,
      rating: v.rating,
      completedJobs: v.completedJobs,
      lastLocationAt: v.lastLocationAt,
      distanceKm: hasCoords && located ? Math.round(haversineKm({ lat, lng }, { lat: address.lat, lng: address.lng }) * 10) / 10 : null,
      busy: busyIds.has(String(v._id)),
      current: String(v._id) === String(booking.vendorId || ''),
    };
  });
  res.json({ vendors, hasLocation: hasCoords });
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
    if (vendor.vendorType === 'towing_provider') return res.status(400).json({ message: `${vendor.name || 'This partner'} is a towing partner and can only take towing jobs.` });
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
  if (update.status === 'completed') update.completedAt = new Date();

  const current = await Order.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Booking not found' });
  // A cancellation carries a refund record — don't let it be silently undone.
  if (current.status === 'cancelled' && update.status && update.status !== 'cancelled') {
    return res.status(400).json({ message: 'A cancelled booking cannot be reopened. Create a new booking instead.' });
  }
  if (update.status === 'cancelled' && current.status !== 'cancelled') {
    applyCancellation(current, { by: 'admin', reason: req.body.cancelReason || 'Cancelled by Battery Boy' });
    if (update.date !== undefined) current.date = update.date;
    if (update.slot !== undefined) current.slot = update.slot;
    await current.save();
    if (current.vendorId) await offerWaitingTowsTo(current.vendorId._id || current.vendorId).catch((err) => console.error('[dispatch] offerWaitingTowsTo failed:', err));
    await current.populate([{ path: 'userId', select: 'name phone' }, { path: 'vendorId', select: 'name phone' }]);
    return res.json({ booking: current });
  }
  // Manually assigning a partner also resolves the "searching" state, same
  // as if a partner had accepted the offer themselves.
  if (req.body.vendorId !== undefined) {
    if (!ASSIGNABLE_STATUSES.includes(current.status)) {
      return res.status(400).json({
        message: ['completed', 'cancelled'].includes(current.status)
          ? `This booking is ${current.status}, so its partner can't be changed.`
          : 'The partner is already at the spot (work has started), so the partner can no longer be changed.',
      });
    }
    if (req.body.vendorId) {
      const [booking, vendor] = await Promise.all([Order.findById(req.params.id).select('services'), Vendor.findById(req.body.vendorId).select('vendorType name active')]);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (!vendor) return res.status(404).json({ message: 'Partner not found' });
      if (!vendor.active) return res.status(400).json({ message: `${vendor.name || 'This partner'} is deactivated.` });
      // Towing partners take one tow at a time (same rule as dispatch).
      if (vendor.vendorType === 'towing_provider' && (await Order.exists({ vendorId: vendor._id, status: { $in: ACTIVE_JOB_STATUSES }, _id: { $ne: current._id } }))) {
        return res.status(400).json({ message: `${vendor.name || 'This partner'} is already on another tow. Assign a free towing partner.` });
      }
      const isTow = booking.services.includes('towing');
      if (isTow !== (vendor.vendorType === 'towing_provider')) {
        return res.status(400).json({ message: isTow ? `${vendor.name || 'This partner'} is not a towing partner. Towing jobs can only go to towing partners.` : `${vendor.name || 'This partner'} is a towing partner and can only take towing jobs.` });
      }
    }
    update.vendorId = req.body.vendorId || null;
    // Assigning (or switching to) a partner makes it their accepted job;
    // removing the partner leaves it waiting for the admin to assign again.
    if (update.status === undefined) update.status = req.body.vendorId ? 'assigned' : 'pending';
  }
  const previousVendorId = current.vendorId;
  const booking = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
    .populate('userId', 'name phone')
    .populate('vendorId', 'name phone');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  // A towing partner taken off this job is free again — show them waiting tows.
  if (req.body.vendorId !== undefined && previousVendorId && String(previousVendorId) !== String(req.body.vendorId || '')) {
    await offerWaitingTowsTo(previousVendorId).catch((err) => console.error('[dispatch] offerWaitingTowsTo failed:', err));
  }
  res.json({ booking });
});

// PATCH /api/admin/bookings/:id/refund { reference } — admin has paid the
// refund back (UPI/bank transfer); records the UTR / reference number.
const markRefundProcessed = asyncHandler(async (req, res) => {
  const booking = await Order.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.refund?.status !== 'pending') {
    return res.status(400).json({ message: booking.refund?.status === 'processed' ? 'This refund is already marked as paid.' : 'There is no refund to pay for this booking.' });
  }
  const reference = String(req.body?.reference || '').trim().slice(0, 80);
  if (!reference) return res.status(400).json({ message: 'Enter the UPI / bank reference (UTR) of the refund payment.' });
  booking.refund.status = 'processed';
  booking.refund.processedAt = new Date();
  booking.refund.reference = reference;
  booking.markModified('refund');
  await booking.save();
  await booking.populate([{ path: 'userId', select: 'name phone' }, { path: 'vendorId', select: 'name phone' }]);
  res.json({ booking });
});

module.exports = { listBookings, getBooking, createBooking, updateBooking, nearbyVendorsForBooking, markRefundProcessed };

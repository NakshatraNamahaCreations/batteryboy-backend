const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const { asyncHandler } = require('../utils/asyncHandler');
const { serializeVendor } = require('./vendorAuthController');
const { RING_WINDOW_MS } = require('../services/dispatch');

// GET /api/vendor/me
const getMe = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.vendorId);
  if (!vendor) return res.status(404).json({ message: 'Partner not found' });
  res.json({ vendor: serializeVendor(vendor) });
});

const VENDOR_TYPES = ['battery_technician', 'mechanic', 'puncture_technician', 'towing_provider', 'multi_service'];

// PATCH /api/vendor/me { name, vendorType?, city?, email? } — completes the
// profile a self-registered partner starts with (see vendorAuthController.sendOtp).
const updateMe = asyncHandler(async (req, res) => {
  const { name, vendorType, city, email } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
  if (vendorType !== undefined && !VENDOR_TYPES.includes(vendorType)) {
    return res.status(400).json({ message: 'Invalid vendor type' });
  }

  const update = { name: name.trim() };
  if (vendorType !== undefined) update.vendorType = vendorType;
  if (city !== undefined) update.city = city.trim();
  if (email !== undefined) update.email = email.trim();

  const vendor = await Vendor.findByIdAndUpdate(req.vendorId, { $set: update }, { new: true, runValidators: true });
  if (!vendor) return res.status(404).json({ message: 'Partner not found' });
  res.json({ vendor: serializeVendor(vendor) });
});

// PATCH /api/vendor/status { online }
const setStatus = asyncHandler(async (req, res) => {
  const { online } = req.body;
  const vendor = await Vendor.findByIdAndUpdate(req.vendorId, { $set: { online: !!online } }, { new: true });
  if (!vendor) return res.status(404).json({ message: 'Partner not found' });
  res.json({ vendor: serializeVendor(vendor) });
});

// PATCH /api/vendor/location { lat, lng }
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ message: 'lat and lng must be numbers' });
  }
  await Vendor.findByIdAndUpdate(req.vendorId, {
    $set: { location: { type: 'Point', coordinates: [lng, lat] }, lastLocationAt: new Date() },
  });
  res.json({ success: true });
});

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// GET /api/vendor/offers — bookings currently being broadcast to this partner
const listOffers = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.vendorId);
  const orders = await Order.find({
    status: 'searching',
    vendorId: null,
    'dispatch.offeredVendorIds': req.vendorId,
    'dispatch.declinedVendorIds': { $ne: req.vendorId },
  })
    .populate('userId', 'name phone')
    .populate('addressId')
    .sort({ createdAt: -1 });

  const [vLng, vLat] = vendor?.location?.coordinates || [0, 0];
  const offers = orders.map((o) => {
    const addr = o.addressId;
    const distanceKm = addr?.lat != null && addr?.lng != null ? haversineKm({ lat: vLat, lng: vLng }, { lat: addr.lat, lng: addr.lng }) : null;
    return {
      orderId: o._id,
      serviceLabel: o.serviceLabel,
      vehicleLabel: o.vehicleLabel,
      amount: o.amount,
      addressLine: addr?.line1 || o.addressLabel,
      customerName: o.userId?.name || 'Customer',
      ring: o.dispatch.ring,
      ringRadiusKm: o.dispatch.ringRadiusKm,
      distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      expiresInSeconds: o.dispatch.ringExpiresAt ? Math.max(0, Math.round((o.dispatch.ringExpiresAt.getTime() - Date.now()) / 1000)) : Math.round(RING_WINDOW_MS / 1000),
    };
  });

  res.json({ offers });
});

// POST /api/vendor/offers/:orderId/accept
const acceptOffer = asyncHandler(async (req, res) => {
  // Atomic: only succeeds if nobody has claimed it yet — the natural race
  // guard against two partners accepting the same booking at once.
  const order = await Order.findOneAndUpdate(
    { _id: req.params.orderId, status: 'searching', vendorId: null, 'dispatch.offeredVendorIds': req.vendorId },
    { $set: { status: 'assigned', vendorId: req.vendorId } },
    { new: true },
  );
  if (!order) {
    return res.status(409).json({ message: 'This job is no longer available — it may have been taken or cancelled.' });
  }
  res.json({ order });
});

// POST /api/vendor/offers/:orderId/decline
const declineOffer = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.orderId, status: 'searching' },
    { $addToSet: { 'dispatch.declinedVendorIds': req.vendorId } },
    { new: true },
  );
  if (!order) return res.status(404).json({ message: 'Offer not found' });
  res.json({ success: true });
});

// GET /api/vendor/jobs?active=true
const listJobs = asyncHandler(async (req, res) => {
  const filter = { vendorId: req.vendorId };
  if (req.query.active === 'true') {
    filter.status = { $in: ['assigned', 'on_way', 'arrived', 'in_progress'] };
  }
  const jobs = await Order.find(filter).populate('userId', 'name phone').populate('addressId').sort({ createdAt: -1 });
  res.json({ jobs });
});

// PATCH /api/vendor/jobs/:orderId/status { status: 'on_way' | 'arrived' | 'completed' }
// Arrival -> in_progress must go through verifyArrivalOtp instead, so the
// OTP check can't be skipped.
const ALLOWED_VENDOR_STATUSES = ['on_way', 'arrived', 'completed'];
const updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_VENDOR_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of ${ALLOWED_VENDOR_STATUSES.join(', ')}` });
  }
  const order = await Order.findOneAndUpdate({ _id: req.params.orderId, vendorId: req.vendorId }, { $set: { status } }, { new: true });
  if (!order) return res.status(404).json({ message: 'Job not found' });

  if (status === 'completed') {
    await Vendor.findByIdAndUpdate(req.vendorId, { $inc: { completedJobs: 1 } });
  }

  res.json({ order });
});

// POST /api/vendor/jobs/:orderId/verify-otp { otp }
const verifyArrivalOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const order = await Order.findOne({ _id: req.params.orderId, vendorId: req.vendorId });
  if (!order) return res.status(404).json({ message: 'Job not found' });

  if (!otp || String(otp).trim() !== order.serviceOtp) {
    return res.status(401).json({ message: 'Incorrect code. Ask the customer to read it out again.' });
  }

  order.status = 'in_progress';
  await order.save();
  res.json({ order });
});

module.exports = { getMe, updateMe, setStatus, updateLocation, listOffers, acceptOffer, declineOffer, listJobs, updateJobStatus, verifyArrivalOtp };

const Order = require('../models/Order');
const Battery = require('../models/Battery');
const Vehicle = require('../models/Vehicle');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const { asyncHandler } = require('../utils/asyncHandler');
const { computePrice, serviceLabel } = require('../utils/pricing');

async function resolveBattery(services, batteryId) {
  if (!services.includes('replacement')) return null;
  if (!batteryId) throw Object.assign(new Error('batteryId is required for a replacement service'), { status: 400 });
  const battery = await Battery.findById(batteryId);
  if (!battery) throw Object.assign(new Error('Battery not found'), { status: 404 });
  return battery;
}

function makeInvoiceNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yy}${mm}-${rand}`;
}

// POST /api/orders/quote { services, night, batteryId?, couponCode? }
// Live price preview — does not touch the database beyond read-only lookups.
const quoteOrder = asyncHandler(async (req, res) => {
  const { services, night, batteryId, couponCode } = req.body;
  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({ message: 'services must be a non-empty array' });
  }

  const battery = await resolveBattery(services, batteryId);
  const coupons = await Coupon.find({ active: true });
  const pricing = computePrice({ services, night, couponCode }, battery, coupons);
  res.json({ pricing, battery });
});

// GET /api/orders
const listOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ orders });
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.userId });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
});

// POST /api/orders
// { services, vehicleId?, batteryId?, addressId, date, slotId, slot, night, couponCode?, paymentMethod? }
const createOrder = asyncHandler(async (req, res) => {
  const { services, vehicleId, batteryId, addressId, date, slotId, slot, night, couponCode, paymentMethod } = req.body;

  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({ message: 'services must be a non-empty array' });
  }
  if (!addressId) {
    return res.status(400).json({ message: 'addressId is required' });
  }

  const address = await Address.findOne({ _id: addressId, userId: req.userId });
  if (!address) return res.status(404).json({ message: 'Address not found' });

  let vehicle = null;
  if (vehicleId) {
    vehicle = await Vehicle.findOne({ _id: vehicleId, userId: req.userId });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  }

  const battery = await resolveBattery(services, batteryId);
  const coupons = await Coupon.find({ active: true });
  // The client may show its own live estimate, but the amount that gets
  // charged is always recomputed here from trusted server-side data.
  const pricing = computePrice({ services, night, couponCode }, battery, coupons);

  const order = await Order.create({
    userId: req.userId,
    services,
    serviceLabel: serviceLabel(services),
    vehicleId: vehicle?._id ?? null,
    vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model}` : '',
    batteryId: battery?._id ?? null,
    batteryLabel: battery ? `${battery.brand} ${battery.model}` : '',
    addressId: address._id,
    addressLabel: address.label,
    date: date || '',
    slotId: slotId || '',
    slot: slot || '',
    night: !!night,
    couponCode: couponCode || '',
    paymentMethod: paymentMethod || '',
    pricing,
    amount: pricing.total,
    status: 'assigned',
    invoiceNo: makeInvoiceNo(),
  });

  res.status(201).json({ order });
});

// PATCH /api/orders/:id { status?, date?, slot?, slotId? }
const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.userId });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const editable = ['status', 'date', 'slot', 'slotId'];
  for (const field of editable) {
    if (req.body[field] !== undefined) order[field] = req.body[field];
  }

  await order.save();
  res.json({ order });
});

module.exports = { quoteOrder, listOrders, getOrder, createOrder, updateOrder };

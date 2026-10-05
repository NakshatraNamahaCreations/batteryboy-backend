const Battery = require('../models/Battery');
const Order = require('../models/Order');
const VehicleCategory = require('../models/VehicleCategory');
const { asyncHandler } = require('../utils/asyncHandler');

// Batteries saved before the `active` flag existed have no value — treat as visible.
const VISIBLE = { active: { $ne: false } };

// GET /api/batteries?category=four_wheeler — public catalog, visible only.
const listBatteries = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = category ? { ...VISIBLE, category } : { ...VISIBLE };
  const batteries = await Battery.find(filter).sort({ recommended: -1, price: 1 });
  res.json({ batteries });
});

// GET /api/batteries/:id — still returns hidden batteries so old orders resolve.
const getBattery = asyncHandler(async (req, res) => {
  const battery = await Battery.findById(req.params.id);
  if (!battery) return res.status(404).json({ message: 'Battery not found' });
  res.json({ battery });
});

// ----- admin -----

// GET /api/admin/batteries — everything, including hidden.
const adminListBatteries = asyncHandler(async (req, res) => {
  const batteries = await Battery.find().sort({ category: 1, recommended: -1, price: 1 });
  res.json({ batteries });
});

const FIELDS = ['brand', 'model', 'capacityAh', 'voltage', 'crankingAmps', 'warrantyMonths', 'price', 'dimensions', 'terminal', 'recommended', 'image', 'category', 'active'];
const NUMBERS = ['capacityAh', 'voltage', 'crankingAmps', 'warrantyMonths', 'price'];

function pick(body) {
  const out = {};
  for (const f of FIELDS) if (body[f] !== undefined) out[f] = body[f];
  for (const n of NUMBERS) {
    if (out[n] === '' || out[n] === null) out[n] = n === 'crankingAmps' ? null : undefined;
    else if (out[n] !== undefined) out[n] = Number(out[n]);
    if (out[n] === undefined) delete out[n];
  }
  for (const s of ['brand', 'model', 'dimensions', 'terminal', 'image', 'category']) if (typeof out[s] === 'string') out[s] = out[s].trim();
  return out;
}

async function validate(data) {
  if (!data.brand) return 'Brand is required';
  if (!data.model) return 'Model is required';
  if (!(data.capacityAh > 0)) return 'Capacity (Ah) must be more than 0';
  if (!(data.price > 0)) return 'Price must be more than 0';
  if (!(data.warrantyMonths >= 0)) return 'Warranty (months) is required';
  if (data.voltage != null && !(data.voltage > 0)) return 'Voltage must be more than 0';
  if (data.crankingAmps != null && !(data.crankingAmps > 0)) return 'Cranking amps must be more than 0';
  if (data.image && !/^https?:\/\//i.test(data.image)) return 'Image must be a web link starting with http:// or https://';
  if (!data.category) return 'Vehicle category is required';
  // When categories are managed in the admin panel, the battery must use one of them.
  if ((await VehicleCategory.estimatedDocumentCount()) > 0 && !(await VehicleCategory.exists({ key: data.category }))) {
    return `Vehicle category "${data.category}" does not exist`;
  }
  return null;
}

// Only one recommended battery per vehicle category — the app highlights it.
async function clearOtherRecommended(battery) {
  if (battery.recommended) await Battery.updateMany({ _id: { $ne: battery._id }, category: battery.category, recommended: true }, { $set: { recommended: false } });
}

// POST /api/admin/batteries
const createBattery = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  const error = await validate(data);
  if (error) return res.status(400).json({ message: error });
  const battery = await Battery.create(data);
  await clearOtherRecommended(battery);
  res.status(201).json({ battery });
});

// PATCH /api/admin/batteries/:id
const updateBattery = asyncHandler(async (req, res) => {
  const battery = await Battery.findById(req.params.id);
  if (!battery) return res.status(404).json({ message: 'Battery not found' });
  const data = pick(req.body);
  const error = await validate({ ...battery.toObject(), ...data });
  if (error) return res.status(400).json({ message: error });
  battery.set(data);
  await battery.save();
  await clearOtherRecommended(battery);
  res.json({ battery });
});

// DELETE /api/admin/batteries/:id — blocked once orders use it (hide instead).
const deleteBattery = asyncHandler(async (req, res) => {
  const battery = await Battery.findById(req.params.id);
  if (!battery) return res.status(404).json({ message: 'Battery not found' });
  const used = await Order.countDocuments({ batteryId: battery._id });
  if (used) {
    return res.status(400).json({ message: `This battery is used in ${used} order${used === 1 ? '' : 's'}, so it can't be deleted. Switch it to Hidden instead.` });
  }
  await battery.deleteOne();
  res.json({ success: true });
});

module.exports = { listBatteries, getBattery, adminListBatteries, createBattery, updateBattery, deleteBattery };

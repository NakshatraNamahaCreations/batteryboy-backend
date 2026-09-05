const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/vehicles
const listVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ userId: req.userId }).sort({ createdAt: 1 });
  res.json({ vehicles });
});

// POST /api/vehicles
const createVehicle = asyncHandler(async (req, res) => {
  const { make, model, registration, category, fuel, year, batteryAh } = req.body;
  if (!make || !model || !category) {
    return res.status(400).json({ message: 'make, model and category are required' });
  }

  const existingCount = await Vehicle.countDocuments({ userId: req.userId });
  const vehicle = await Vehicle.create({
    userId: req.userId,
    make,
    model,
    registration: registration || '',
    category,
    fuel: fuel || '',
    year: year ?? null,
    batteryAh: batteryAh ?? null,
    health: 100,
    lastChecked: '',
    primary: existingCount === 0, // first vehicle for a user becomes primary automatically
  });

  if (vehicle.primary) {
    await User.findByIdAndUpdate(req.userId, { primaryVehicleId: vehicle._id });
  }

  res.status(201).json({ vehicle });
});

// PATCH /api/vehicles/:id { setPrimary?: true, ...fields }
const updateVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicle = await Vehicle.findOne({ _id: id, userId: req.userId });
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

  if (req.body.setPrimary) {
    await Vehicle.updateMany({ userId: req.userId }, { $set: { primary: false } });
    vehicle.primary = true;
    await User.findByIdAndUpdate(req.userId, { primaryVehicleId: vehicle._id });
  }

  const editable = ['make', 'model', 'registration', 'category', 'fuel', 'year', 'batteryAh', 'health', 'lastChecked'];
  for (const field of editable) {
    if (req.body[field] !== undefined) vehicle[field] = req.body[field];
  }

  await vehicle.save();
  res.json({ vehicle });
});

// DELETE /api/vehicles/:id
const deleteVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicle = await Vehicle.findOneAndDelete({ _id: id, userId: req.userId });
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

  if (vehicle.primary) {
    const next = await Vehicle.findOne({ userId: req.userId }).sort({ createdAt: 1 });
    if (next) {
      next.primary = true;
      await next.save();
      await User.findByIdAndUpdate(req.userId, { primaryVehicleId: next._id });
    } else {
      await User.findByIdAndUpdate(req.userId, { primaryVehicleId: null });
    }
  }

  res.json({ success: true });
});

module.exports = { listVehicles, createVehicle, updateVehicle, deleteVehicle };

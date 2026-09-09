const VehicleCategory = require('../models/VehicleCategory');
const VehicleBrand = require('../models/VehicleBrand');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/vehicle-categories (public) or /api/admin/vehicle-categories (admin — includes inactive)
const listVehicleCategories = asyncHandler(async (req, res) => {
  const filter = req.adminId ? {} : { active: true };
  const categories = await VehicleCategory.find(filter).sort({ order: 1, label: 1 });
  res.json({ categories });
});

// POST /api/admin/vehicle-categories
const createVehicleCategory = asyncHandler(async (req, res) => {
  const { key, label, subtitle, icon, movingVehicle, evCapable, order, active } = req.body;
  if (!key || !label) return res.status(400).json({ message: 'key and label are required' });

  const category = await VehicleCategory.create({
    key: key.trim().toLowerCase().replace(/\s+/g, '_'),
    label,
    subtitle: subtitle || '',
    icon: icon || undefined,
    movingVehicle: movingVehicle ?? true,
    evCapable: evCapable ?? false,
    order: order ?? 0,
    active: active ?? true,
  });
  res.status(201).json({ category });
});

// PATCH /api/admin/vehicle-categories/:id
const updateVehicleCategory = asyncHandler(async (req, res) => {
  const editable = ['key', 'label', 'subtitle', 'icon', 'movingVehicle', 'evCapable', 'order', 'active'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  if (update.key) update.key = update.key.trim().toLowerCase().replace(/\s+/g, '_');

  const category = await VehicleCategory.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ message: 'Vehicle category not found' });
  res.json({ category });
});

// DELETE /api/admin/vehicle-categories/:id
const deleteVehicleCategory = asyncHandler(async (req, res) => {
  const inUse = await VehicleBrand.countDocuments({ categoryId: req.params.id });
  if (inUse > 0) {
    return res.status(409).json({ message: `Cannot delete: ${inUse} brand(s) still use this category` });
  }
  const category = await VehicleCategory.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: 'Vehicle category not found' });
  res.json({ success: true });
});

module.exports = { listVehicleCategories, createVehicleCategory, updateVehicleCategory, deleteVehicleCategory };

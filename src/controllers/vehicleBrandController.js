const VehicleBrand = require('../models/VehicleBrand');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/vehicle-brands?categoryId=...&evOnly=true (public) or /api/admin/vehicle-brands (admin — includes inactive)
const listVehicleBrands = asyncHandler(async (req, res) => {
  const filter = req.adminId ? {} : { active: true };
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.evOnly !== undefined) filter.evOnly = req.query.evOnly === 'true';
  const brands = await VehicleBrand.find(filter).populate('categoryId', 'label key').sort({ order: 1, name: 1 });
  res.json({ brands });
});

// POST /api/admin/vehicle-brands
const createVehicleBrand = asyncHandler(async (req, res) => {
  const { name, categoryId, logoDomain, evOnly, models, order, active } = req.body;
  if (!name || !categoryId) return res.status(400).json({ message: 'name and categoryId are required' });

  const brand = await VehicleBrand.create({
    name,
    categoryId,
    logoDomain: logoDomain || '',
    evOnly: evOnly ?? false,
    models: Array.isArray(models) ? models.filter((m) => m?.name?.trim()) : [],
    order: order ?? 0,
    active: active ?? true,
  });
  const populated = await brand.populate('categoryId', 'label key');
  res.status(201).json({ brand: populated });
});

// PATCH /api/admin/vehicle-brands/:id — `models` (if sent) fully replaces the model list
const updateVehicleBrand = asyncHandler(async (req, res) => {
  const editable = ['name', 'categoryId', 'logoDomain', 'evOnly', 'order', 'active'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  if (Array.isArray(req.body.models)) {
    update.models = req.body.models.filter((m) => m?.name?.trim());
  }

  const brand = await VehicleBrand.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).populate(
    'categoryId',
    'label key',
  );
  if (!brand) return res.status(404).json({ message: 'Vehicle brand not found' });
  res.json({ brand });
});

// DELETE /api/admin/vehicle-brands/:id
const deleteVehicleBrand = asyncHandler(async (req, res) => {
  const brand = await VehicleBrand.findByIdAndDelete(req.params.id);
  if (!brand) return res.status(404).json({ message: 'Vehicle brand not found' });
  res.json({ success: true });
});

module.exports = { listVehicleBrands, createVehicleBrand, updateVehicleBrand, deleteVehicleBrand };

const Service = require('../models/Service');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/services?categoryId=... (public) or /api/admin/services (admin — includes inactive)
const listServices = asyncHandler(async (req, res) => {
  const filter = req.adminId ? {} : { active: true };
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  const services = await Service.find(filter).populate('categoryId', 'name icon').sort({ order: 1, name: 1 });
  res.json({ services });
});

// GET /api/admin/services/:id
const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).populate('categoryId', 'name icon');
  if (!service) return res.status(404).json({ message: 'Service not found' });
  res.json({ service });
});

// POST /api/admin/services
const createService = asyncHandler(async (req, res) => {
  const { name, categoryId, description, icon, basePrice, estimatedDurationMins, vehicleTypes, order, active } = req.body;
  if (!name || !categoryId || basePrice === undefined) {
    return res.status(400).json({ message: 'name, categoryId and basePrice are required' });
  }

  const service = await Service.create({
    name,
    categoryId,
    description: description || '',
    icon: icon || undefined,
    basePrice,
    estimatedDurationMins: estimatedDurationMins ?? 30,
    vehicleTypes: vehicleTypes?.length ? vehicleTypes : ['both'],
    order: order ?? 0,
    active: active ?? true,
  });
  const populated = await service.populate('categoryId', 'name icon');
  res.status(201).json({ service: populated });
});

// PATCH /api/admin/services/:id
const updateService = asyncHandler(async (req, res) => {
  const editable = ['name', 'categoryId', 'description', 'icon', 'basePrice', 'estimatedDurationMins', 'vehicleTypes', 'order', 'active'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  const service = await Service.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).populate(
    'categoryId',
    'name icon',
  );
  if (!service) return res.status(404).json({ message: 'Service not found' });
  res.json({ service });
});

// DELETE /api/admin/services/:id
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  res.json({ success: true });
});

module.exports = { listServices, getService, createService, updateService, deleteService };

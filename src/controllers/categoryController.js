const Category = require('../models/Category');
const Service = require('../models/Service');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/categories (public) or /api/admin/categories (admin — includes inactive)
const listCategories = asyncHandler(async (req, res) => {
  const filter = req.adminId ? {} : { active: true };
  const categories = await Category.find(filter).sort({ order: 1, name: 1 });
  res.json({ categories });
});

// POST /api/admin/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, description, order, active } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });

  const category = await Category.create({
    name,
    icon: icon || undefined,
    description: description || '',
    order: order ?? 0,
    active: active ?? true,
  });
  res.status(201).json({ category });
});

// PATCH /api/admin/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const editable = ['name', 'icon', 'description', 'order', 'active'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  const category = await Category.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ category });
});

// DELETE /api/admin/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const inUse = await Service.countDocuments({ categoryId: req.params.id });
  if (inUse > 0) {
    return res.status(409).json({ message: `Cannot delete: ${inUse} service(s) still use this category` });
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ success: true });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };

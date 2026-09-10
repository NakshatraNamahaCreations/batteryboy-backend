const Vendor = require('../models/Vendor');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/admin/vendors?verified=true&active=true&q=search
const listVendors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.verified !== undefined) filter.verified = req.query.verified === 'true';
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  if (req.query.q) {
    const re = new RegExp(req.query.q, 'i');
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
  res.json({ vendors });
});

// POST /api/admin/vendors
const createVendor = asyncHandler(async (req, res) => {
  const { name, phone, email, city, vendorType, skills, serviceAreas, notes, lat, lng } = req.body;
  if (!name || !phone) return res.status(400).json({ message: 'name and phone are required' });

  const vendor = await Vendor.create({
    name,
    phone,
    email: email || '',
    city: city || '',
    vendorType: vendorType || 'multi_service',
    skills: skills || [],
    serviceAreas: serviceAreas || [],
    notes: notes || '',
    ...(typeof lat === 'number' && typeof lng === 'number'
      ? { location: { type: 'Point', coordinates: [lng, lat] }, lastLocationAt: new Date() }
      : {}),
  });
  res.status(201).json({ vendor });
});

// PATCH /api/admin/vendors/:id  (also used to toggle verified/active, or pin a base location)
const updateVendor = asyncHandler(async (req, res) => {
  const editable = ['name', 'phone', 'email', 'city', 'vendorType', 'skills', 'serviceAreas', 'verified', 'active', 'notes'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  if (typeof req.body.lat === 'number' && typeof req.body.lng === 'number') {
    update.location = { type: 'Point', coordinates: [req.body.lng, req.body.lat] };
    update.lastLocationAt = new Date();
  }
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
  res.json({ vendor });
});

// DELETE /api/admin/vendors/:id
const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
  res.json({ success: true });
});

module.exports = { listVendors, createVendor, updateVendor, deleteVendor };

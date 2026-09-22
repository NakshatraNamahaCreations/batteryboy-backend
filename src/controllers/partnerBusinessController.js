const PartnerBusiness = require('../models/PartnerBusiness');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/partner-businesses?type=puncture (public, active only) or
// GET /api/admin/partner-businesses?type=puncture (admin — includes inactive)
const listPartnerBusinesses = asyncHandler(async (req, res) => {
  const filter = req.adminId ? {} : { active: true };
  if (req.query.type) filter.type = req.query.type;
  const businesses = await PartnerBusiness.find(filter).sort({ order: 1, name: 1 });
  res.json({ businesses });
});

// POST /api/admin/partner-businesses
const createPartnerBusiness = asyncHandler(async (req, res) => {
  const { type, name, phone, priceFrom, rating, lat, lng, status, active, order } = req.body;
  if (!['puncture', 'towing'].includes(type)) return res.status(400).json({ message: 'type must be puncture or towing' });
  if (!name?.trim() || !phone?.trim()) return res.status(400).json({ message: 'name and phone are required' });
  if (!(Number(priceFrom) >= 0)) return res.status(400).json({ message: 'A valid priceFrom is required' });
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ message: 'lat and lng are required' });

  const business = await PartnerBusiness.create({
    type,
    name: name.trim(),
    phone: phone.trim(),
    priceFrom: Number(priceFrom),
    rating: rating != null ? Number(rating) : undefined,
    lat,
    lng,
    status: status || 'open',
    active: active !== undefined ? !!active : true,
    order: order || 0,
  });
  res.status(201).json({ business });
});

// PATCH /api/admin/partner-businesses/:id
const updatePartnerBusiness = asyncHandler(async (req, res) => {
  const editable = ['type', 'name', 'phone', 'priceFrom', 'rating', 'lat', 'lng', 'status', 'active', 'order'];
  const update = {};
  for (const field of editable) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  const business = await PartnerBusiness.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!business) return res.status(404).json({ message: 'Partner business not found' });
  res.json({ business });
});

// DELETE /api/admin/partner-businesses/:id
const deletePartnerBusiness = asyncHandler(async (req, res) => {
  const business = await PartnerBusiness.findByIdAndDelete(req.params.id);
  if (!business) return res.status(404).json({ message: 'Partner business not found' });
  res.json({ success: true });
});

module.exports = { listPartnerBusinesses, createPartnerBusiness, updatePartnerBusiness, deletePartnerBusiness };

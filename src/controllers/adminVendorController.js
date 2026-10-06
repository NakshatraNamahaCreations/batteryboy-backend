const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const { asyncHandler } = require('../utils/asyncHandler');
const { normalizeIndianMobile } = require('../utils/phone');
const { ACTIVE_JOB_STATUSES } = require('../services/dispatch');

const escapeRegex = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Same number in any written form = same partner (see utils/phone.js).
async function phoneTaken(ten, exceptId) {
  const found = await Vendor.findOne({ phone: { $in: [ten, `+91${ten}`] }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select('name');
  return found;
}

// GET /api/admin/vendors?verified=true&active=true&q=search
const listVendors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.verified !== undefined) filter.verified = req.query.verified === 'true';
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
  res.json({ vendors });
});

// POST /api/admin/vendors
const createVendor = asyncHandler(async (req, res) => {
  const { name, phone, email, city, vendorType, skills, serviceAreas, notes, lat, lng, verified } = req.body;
  if (!name || !phone) return res.status(400).json({ message: 'name and phone are required' });
  const ten = normalizeIndianMobile(phone);
  if (!ten) return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
  const taken = await phoneTaken(ten);
  if (taken) return res.status(409).json({ message: `This number is already registered${taken.name ? ` to ${taken.name}` : ''}. Find them in Vendors.` });

  const vendor = await Vendor.create({
    name: String(name).trim(),
    phone: ten,
    // An admin adding a partner directly is vouching for them.
    verified: verified === true,
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
  if (update.name !== undefined) {
    update.name = String(update.name).trim();
    if (!update.name) return res.status(400).json({ message: 'Name cannot be empty' });
  }
  if (update.vendorType !== undefined) {
    const current = await Vendor.findById(req.params.id).select('vendorType');
    if (!current) return res.status(404).json({ message: 'Vendor not found' });
    // A tow truck turned "technician" mid-job (or vice versa) would break that job.
    if (current.vendorType !== update.vendorType && (await Order.exists({ vendorId: current._id, status: { $in: ACTIVE_JOB_STATUSES } }))) {
      return res.status(400).json({ message: 'This partner is on an active job. Change their type after the job is completed.' });
    }
  }
  if (update.phone !== undefined) {
    const ten = normalizeIndianMobile(update.phone);
    if (!ten) return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
    const taken = await phoneTaken(ten, req.params.id);
    if (taken) return res.status(409).json({ message: `This number is already registered${taken.name ? ` to ${taken.name}` : ''}.` });
    update.phone = ten;
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

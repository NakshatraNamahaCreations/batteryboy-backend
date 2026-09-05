const Address = require('../models/Address');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/addresses
const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.userId }).sort({ createdAt: 1 });
  res.json({ addresses });
});

// POST /api/addresses
const createAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, lat, lng, icon } = req.body;
  if (!label || !line1) {
    return res.status(400).json({ message: 'label and line1 are required' });
  }

  const existingCount = await Address.countDocuments({ userId: req.userId });
  const address = await Address.create({
    userId: req.userId,
    label,
    line1,
    line2: line2 || '',
    lat: lat ?? null,
    lng: lng ?? null,
    icon: icon || 'location',
    isDefault: existingCount === 0,
  });

  res.status(201).json({ address });
});

// PATCH /api/addresses/:id { setDefault?: true, ...fields }
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOne({ _id: id, userId: req.userId });
  if (!address) return res.status(404).json({ message: 'Address not found' });

  if (req.body.setDefault) {
    await Address.updateMany({ userId: req.userId }, { $set: { isDefault: false } });
    address.isDefault = true;
  }

  const editable = ['label', 'line1', 'line2', 'lat', 'lng', 'icon'];
  for (const field of editable) {
    if (req.body[field] !== undefined) address[field] = req.body[field];
  }

  await address.save();
  res.json({ address });
});

// DELETE /api/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOneAndDelete({ _id: id, userId: req.userId });
  if (!address) return res.status(404).json({ message: 'Address not found' });

  if (address.isDefault) {
    const next = await Address.findOne({ userId: req.userId }).sort({ createdAt: 1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  res.json({ success: true });
});

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress };

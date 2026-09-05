const Battery = require('../models/Battery');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/batteries?category=four_wheeler
const listBatteries = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const batteries = await Battery.find(filter).sort({ recommended: -1, price: 1 });
  res.json({ batteries });
});

// GET /api/batteries/:id
const getBattery = asyncHandler(async (req, res) => {
  const battery = await Battery.findById(req.params.id);
  if (!battery) return res.status(404).json({ message: 'Battery not found' });
  res.json({ battery });
});

module.exports = { listBatteries, getBattery };

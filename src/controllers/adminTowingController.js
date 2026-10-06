const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const { asyncHandler } = require('../utils/asyncHandler');
const { getTowingRates, setTowingRates } = require('../services/towing');

// GET /api/admin/towing — rates + the towing partners who receive tow jobs.
const getTowingOverview = asyncHandler(async (req, res) => {
  const [rates, partners, openJobs] = await Promise.all([
    getTowingRates(),
    Vendor.find({ vendorType: 'towing_provider' }).select('name phone city verified active online rating completedJobs lastLocationAt').sort({ online: -1, name: 1 }),
    Order.countDocuments({ services: 'towing', status: { $in: ['searching', 'assigned', 'on_way', 'arrived', 'in_progress'] } }),
  ]);
  res.json({ rates, partners, openJobs, distanceSource: process.env.GOOGLE_MAPS_API_KEY ? 'road' : 'estimate' });
});

// PUT /api/admin/towing/rates { baseFare, perKm }
const updateTowingRates = asyncHandler(async (req, res) => {
  const baseFare = Number(req.body.baseFare);
  const perKm = Number(req.body.perKm);
  if (!(baseFare >= 0) || !(perKm >= 0)) return res.status(400).json({ message: 'Base fare and per-km rate must be 0 or more' });
  if (baseFare === 0 && perKm === 0) return res.status(400).json({ message: 'Set a base fare or a per-km rate' });
  res.json({ rates: await setTowingRates({ baseFare, perKm }) });
});

module.exports = { getTowingOverview, updateTowingRates };

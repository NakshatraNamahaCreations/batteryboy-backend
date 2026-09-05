const Warranty = require('../models/Warranty');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/warranties
const listWarranties = asyncHandler(async (req, res) => {
  const warranties = await Warranty.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ warranties });
});

// POST /api/warranties/:id/claim — placeholder claim workflow: flips status
// to 'active' with a note that a claim was filed. A real implementation
// would create a separate Claim document and a review queue.
const fileClaim = asyncHandler(async (req, res) => {
  const warranty = await Warranty.findOne({ _id: req.params.id, userId: req.userId });
  if (!warranty) return res.status(404).json({ message: 'Warranty not found' });
  res.json({ warranty, claim: { status: 'submitted', note: req.body.note || '' } });
});

module.exports = { listWarranties, fileClaim };

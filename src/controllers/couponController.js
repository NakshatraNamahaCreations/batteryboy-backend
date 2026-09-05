const Coupon = require('../models/Coupon');
const { asyncHandler } = require('../utils/asyncHandler');

// POST /api/coupons/validate { code }
const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ message: 'code is required' });
  }

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), active: true });
  if (!coupon) {
    return res.json({ valid: false, discount: 0 });
  }
  res.json({ valid: true, discount: coupon.discount, description: coupon.description });
});

module.exports = { validateCoupon };

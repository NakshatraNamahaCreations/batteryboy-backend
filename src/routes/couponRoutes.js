const express = require('express');
const { validateCoupon } = require('../controllers/couponController');

// Coupon validation is allowed pre-login (Offers screen is reachable unauthed).
const router = express.Router();

router.post('/validate', validateCoupon);

module.exports = router;

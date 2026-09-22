const express = require('express');
const { listPartnerBusinesses } = require('../controllers/partnerBusinessController');

// Public read — browsing puncture/towing partners doesn't require login.
const router = express.Router();
router.get('/', listPartnerBusinesses);

module.exports = router;

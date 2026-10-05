const express = require('express');
const { getSosConfig } = require('../controllers/sosController');

// Public — guests can raise an SOS without an account.
const router = express.Router();
router.get('/config', getSosConfig);

module.exports = router;

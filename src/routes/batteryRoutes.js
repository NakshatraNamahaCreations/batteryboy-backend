const express = require('express');
const { listBatteries, getBattery } = require('../controllers/batteryController');

// Public catalog — no auth required, matches browsing batteries before login.
const router = express.Router();

router.get('/', listBatteries);
router.get('/:id', getBattery);

module.exports = router;

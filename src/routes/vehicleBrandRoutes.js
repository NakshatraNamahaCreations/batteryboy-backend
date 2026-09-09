const express = require('express');
const { listVehicleBrands } = require('../controllers/vehicleBrandController');

const router = express.Router();
router.get('/', listVehicleBrands);

module.exports = router;

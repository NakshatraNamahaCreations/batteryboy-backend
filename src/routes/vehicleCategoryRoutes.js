const express = require('express');
const { listVehicleCategories } = require('../controllers/vehicleCategoryController');

const router = express.Router();
router.get('/', listVehicleCategories);

module.exports = router;

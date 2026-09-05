const express = require('express');
const { listVehicles, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listVehicles);
router.post('/', createVehicle);
router.patch('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;

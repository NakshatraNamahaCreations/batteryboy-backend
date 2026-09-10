const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');

const { login, me } = require('../controllers/adminAuthController');
const { listCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { listServices, getService, createService, updateService, deleteService } = require('../controllers/serviceController');
const { listVendors, createVendor, updateVendor, deleteVendor } = require('../controllers/adminVendorController');
const { listCustomers, getCustomer } = require('../controllers/adminCustomerController');
const { listBookings, getBooking, updateBooking, nearbyVendorsForBooking } = require('../controllers/adminOrderController');
const { getStats } = require('../controllers/adminStatsController');
const {
  listVehicleCategories,
  createVehicleCategory,
  updateVehicleCategory,
  deleteVehicleCategory,
} = require('../controllers/vehicleCategoryController');
const {
  listVehicleBrands,
  createVehicleBrand,
  updateVehicleBrand,
  deleteVehicleBrand,
} = require('../controllers/vehicleBrandController');

const router = express.Router();

// Auth — login is the only unauthenticated admin route.
router.post('/auth/login', login);
router.get('/auth/me', requireAdmin, me);

router.use(requireAdmin);

router.get('/stats', getStats);

router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/services', listServices);
router.get('/services/:id', getService);
router.post('/services', createService);
router.patch('/services/:id', updateService);
router.delete('/services/:id', deleteService);

router.get('/vendors', listVendors);
router.post('/vendors', createVendor);
router.patch('/vendors/:id', updateVendor);
router.delete('/vendors/:id', deleteVendor);

router.get('/customers', listCustomers);
router.get('/customers/:id', getCustomer);

router.get('/bookings', listBookings);
router.get('/bookings/:id', getBooking);
router.get('/bookings/:id/nearby-vendors', nearbyVendorsForBooking);
router.patch('/bookings/:id', updateBooking);

router.get('/vehicle-categories', listVehicleCategories);
router.post('/vehicle-categories', createVehicleCategory);
router.patch('/vehicle-categories/:id', updateVehicleCategory);
router.delete('/vehicle-categories/:id', deleteVehicleCategory);

router.get('/vehicle-brands', listVehicleBrands);
router.post('/vehicle-brands', createVehicleBrand);
router.patch('/vehicle-brands/:id', updateVehicleBrand);
router.delete('/vehicle-brands/:id', deleteVehicleBrand);

module.exports = router;

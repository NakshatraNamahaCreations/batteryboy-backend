const express = require('express');
const { listServices } = require('../controllers/serviceController');

// Public read — browsing services doesn't require login.
const router = express.Router();
router.get('/', listServices);

module.exports = router;

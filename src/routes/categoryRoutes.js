const express = require('express');
const { listCategories } = require('../controllers/categoryController');

// Public read — browsing categories doesn't require login.
const router = express.Router();
router.get('/', listCategories);

module.exports = router;

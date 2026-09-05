const express = require('express');
const { listWarranties, fileClaim } = require('../controllers/warrantyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listWarranties);
router.post('/:id/claim', fileClaim);

module.exports = router;

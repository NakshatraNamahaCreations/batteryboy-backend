const express = require('express');
const { listNotifications, markAllRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.patch('/read-all', markAllRead);

module.exports = router;

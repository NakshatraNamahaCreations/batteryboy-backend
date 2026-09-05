const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ notifications });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.userId, unread: true }, { $set: { unread: false } });
  res.json({ success: true });
});

module.exports = { listNotifications, markAllRead };

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    group: { type: String, default: 'Today' },
    unread: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);

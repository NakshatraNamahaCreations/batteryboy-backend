const mongoose = require('mongoose');

// One chat message between a customer and the partner assigned to their
// order. Chat is per-order (like Rapido/Uber): it opens when a partner is
// assigned and turns read-only once the order is completed or cancelled.
const messageSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    senderRole: { type: String, enum: ['customer', 'vendor'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    // Set when the *other* side fetches the thread — drives "Seen" and the
    // unread badge on the tracking / job screens.
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ orderId: 1, _id: 1 });

module.exports = mongoose.model('Message', messageSchema);

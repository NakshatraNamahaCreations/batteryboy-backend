const mongoose = require('mongoose');
const Order = require('../models/Order');
const Message = require('../models/Message');
const { asyncHandler } = require('../utils/asyncHandler');

const CLOSED_STATUSES = ['completed', 'cancelled'];
const MAX_TEXT = 1000;

// The customer and the partner see the same thread through different routes
// (/api/orders/:id/messages and /api/vendor/jobs/:orderId/messages) and are
// authorised differently — only the order's owner, or the partner assigned to
// it, may read or write. Everything else is identical, so one factory serves
// both instead of two near-copies.
function chatHandlers(role) {
  const other = role === 'customer' ? 'vendor' : 'customer';

  async function loadOrder(req) {
    const orderId = req.params.orderId ?? req.params.id;
    if (!mongoose.isValidObjectId(orderId)) return null;
    return role === 'customer'
      ? Order.findOne({ _id: orderId, userId: req.userId })
      : Order.findOne({ _id: orderId, vendorId: req.vendorId });
  }

  // Sending needs an assigned partner and an order that's still open.
  const canSend = (order) => !!order.vendorId && !CLOSED_STATUSES.includes(order.status);

  // GET — the whole thread (oldest first), marking the other side's messages
  // as read. `?after=<messageId>` returns only newer messages.
  const list = asyncHandler(async (req, res) => {
    const order = await loadOrder(req);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const filter = { orderId: order._id };
    if (req.query.after && mongoose.isValidObjectId(req.query.after)) filter._id = { $gt: req.query.after };
    const messages = await Message.find(filter).sort({ _id: 1 }).limit(300);

    if (messages.some((m) => m.senderRole === other && !m.readAt)) {
      await Message.updateMany({ orderId: order._id, senderRole: other, readAt: null }, { $set: { readAt: new Date() } });
    }
    res.json({ messages, canSend: canSend(order), assigned: !!order.vendorId, orderStatus: order.status });
  });

  // POST { text }
  const send = asyncHandler(async (req, res) => {
    const order = await loadOrder(req);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.vendorId) return res.status(409).json({ message: 'Chat opens once a partner is assigned.' });
    if (CLOSED_STATUSES.includes(order.status)) return res.status(409).json({ message: 'This job is closed — chat is read-only.' });

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Message cannot be empty' });
    if (text.length > MAX_TEXT) return res.status(400).json({ message: `Message is too long (max ${MAX_TEXT} characters)` });

    const message = await Message.create({ orderId: order._id, senderRole: role, text });
    res.status(201).json({ message });
  });

  // GET — how many of the other side's messages are still unread.
  const unread = asyncHandler(async (req, res) => {
    const order = await loadOrder(req);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const count = await Message.countDocuments({ orderId: order._id, senderRole: other, readAt: null });
    res.json({ unread: count });
  });

  return { list, send, unread };
}

module.exports = { chatHandlers };

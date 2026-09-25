const express = require('express');
const { quoteOrder, listOrders, getOrder, createOrder, updateOrder } = require('../controllers/orderController');
const { chatHandlers } = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const chat = chatHandlers('customer');

router.use(requireAuth);
router.post('/quote', quoteOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.patch('/:id', updateOrder);

// Customer <-> assigned partner chat for one order.
router.get('/:id/messages/unread', chat.unread);
router.get('/:id/messages', chat.list);
router.post('/:id/messages', chat.send);

module.exports = router;

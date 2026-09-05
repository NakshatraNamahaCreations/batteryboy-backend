const express = require('express');
const { quoteOrder, listOrders, getOrder, createOrder, updateOrder } = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/quote', quoteOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.patch('/:id', updateOrder);

module.exports = router;

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware'); // PA kllapa!

const { createOrder, getAllOrders } = require('../controllers/order.controller');

router.post('/', createOrder);
router.get('/', authenticateToken, getAllOrders);

module.exports = router;

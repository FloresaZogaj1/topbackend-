const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const { createOrder, getAllOrders } = require('../controllers/order.controller');

// Rikthe login (tani që testimi kaloi)
router.post('/', authenticateToken, createOrder);

// Mbetet e mbrojtur
router.get('/', authenticateToken, getAllOrders);

module.exports = router;

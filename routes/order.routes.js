const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth');
const { createOrder, getAllOrders } = require('../controllers/order.controller');

// POST për të gjithë (guest ose user)
router.post('/', optionalAuth, createOrder);

// GET vetëm për user/admin
router.get('/', authenticateToken, getAllOrders);

module.exports = router;

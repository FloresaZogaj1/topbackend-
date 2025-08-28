const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth.middleware');
const { getOrdersForUser } = require('../controllers/order.controller');

// Porositë e user-it të kyçur
router.get('/orders', authenticateToken, getOrdersForUser);

module.exports = router;

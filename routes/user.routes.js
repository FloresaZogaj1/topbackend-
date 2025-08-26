// routes/orders.routes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');

const {
  createOrder,
  getOrdersForUser
} = require('../controllers/order.controller');

// krijo porosi (le të kërkojë token sipas logjikës tënde)
router.post('/', authenticateToken, createOrder);

// porositë e user-it të loguar
router.get('/my', authenticateToken, getOrdersForUser);

module.exports = router;

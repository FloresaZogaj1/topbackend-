// routes/admin.orders.routes.js
const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/order.controller');

// GET    /api/admin/orders
router.get('/orders', getAllOrders);

// PUT    /api/admin/orders/:id/status    { status?, payment_status? }
router.put('/orders/:id/status', updateOrderStatus);

// DELETE /api/admin/orders/:id
router.delete('/orders/:id', deleteOrder);

module.exports = router;

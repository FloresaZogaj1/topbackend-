// routes/admin.orders.routes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
// përdor të njëjtin guard si rruget e tjera admin:
const requireAdmin = require('../middleware/requireAdmin');

const {
  getAllOrders,
  updateOrderAdmin,
  deleteOrderAdmin
} = require('../controllers/order.controller');

router.get('/orders', authenticateToken, requireAdmin, getAllOrders);
router.patch('/orders/:id', authenticateToken, requireAdmin, updateOrderAdmin);
router.delete('/orders/:id', authenticateToken, requireAdmin, deleteOrderAdmin);

module.exports = router;

// routes/admin.orders.routes.js
const express = require('express');
const router = express.Router();

// ✅ Default import
const authenticateToken = require('../middleware/auth.middleware');
// ✅ Named import
const { requireAdmin } = require('../middleware/requireAdmin');

// ✅ Importo controller-at me emra të përputhshëm
const {
  getAllOrders,
  updateOrderAdmin,
  deleteOrderAdmin,
} = require('../controllers/order.controller');

// --- Admin endpoints ---
router.get('/orders', authenticateToken, requireAdmin, getAllOrders);
router.patch('/orders/:id', authenticateToken, requireAdmin, updateOrderAdmin);
router.delete('/orders/:id', authenticateToken, requireAdmin, deleteOrderAdmin);

module.exports = router;

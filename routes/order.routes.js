// routes/order.routes.js
const express = require('express');
const router = express.Router();

// ⚠️ import default (pa kllapa)
const authenticateToken = require('../middleware/auth.middleware');
// named import
const { requireAdmin } = require('../middleware/requireAdmin');

// Controller (named exports)
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/order.controller');

// --- PUBLIC ---
// Krijo porosi (checkout pa login)
router.post('/', createOrder);

// --- USER (me JWT) ---
router.get('/mine', authenticateToken, getMyOrders);
router.get('/:id', authenticateToken, getOrderById);

// --- ADMIN (me JWT + admin) ---
router.get('/', authenticateToken, requireAdmin, getAllOrders);
router.put('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

module.exports = router;

const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth.middleware');
const orderCtl = require('../controllers/order.controller');

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

// Admin endpoints
router.get('/orders', authenticateToken, requireRole('admin'), orderCtl.getAllOrders);
router.patch('/orders/:id', authenticateToken, requireRole('admin'), orderCtl.updateOrderAdmin);
router.delete('/orders/:id', authenticateToken, requireRole('admin'), orderCtl.deleteOrderAdmin);

module.exports = router;

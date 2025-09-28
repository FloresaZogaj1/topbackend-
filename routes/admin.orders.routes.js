// routes/admin.orders.routes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

function mustBeFn(fn, name) {
  if (typeof fn !== 'function') {
    console.error(`[AdminOrdersRoutes] ${name} is not a function. Got:`, typeof fn, fn);
    throw new TypeError(`Handler "${name}" must be a function`);
  }
  return fn;
}

/**
 * Mount: app.use('/api/admin', authenticateToken, requireAdmin, adminOrdersRoutes)
 * Paths:
 *  GET    /api/admin/orders
 *  PUT    /api/admin/orders/:id/status
 *  DELETE /api/admin/orders/:id
 */
router.get('/orders',
  mustBeFn(orderController.getAllOrders, 'orderController.getAllOrders')
);

router.put('/orders/:id/status',
  mustBeFn(orderController.updateOrderStatus, 'orderController.updateOrderStatus')
);

router.delete('/orders/:id',
  mustBeFn(orderController.deleteOrder, 'orderController.deleteOrder')
);

module.exports = router;

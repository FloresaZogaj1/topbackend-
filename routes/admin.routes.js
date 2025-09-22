// routes/admin.orders.routes.js
const express = require('express');
const router = express.Router();

// Do t'i përdorim handler-at admin nga controllers/order.controller.js
const orderController = require('../controllers/order.controller');

// Guard i vogël për të kapur menjëherë emra të gabuar/undefined
function mustBeFn(fn, name) {
  if (typeof fn !== 'function') {
    console.error(`[AdminOrdersRoutes] ${name} is not a function. Got:`, typeof fn, fn);
    throw new TypeError(`Handler "${name}" must be a function`);
  }
  return fn;
}

/**
 * Rrugët nën /api/admin/...
 * Meqë mount-i në server.js është: app.use('/api/admin', ..., adminOrdersRoutes)
 * Këtu shtojmë vetëm suffix-in "orders", p.sh.:
 *  GET    /api/admin/orders
 *  PUT    /api/admin/orders/:id/status
 *  DELETE /api/admin/orders/:id
 */

// Lista e të gjitha porosive (ADMIN)
router.get(
  '/orders',
  mustBeFn(orderController.getAllOrders, 'orderController.getAllOrders')
);

// Update statusi i porosisë (ADMIN)
router.put(
  '/orders/:id/status',
  mustBeFn(orderController.updateOrderStatus, 'orderController.updateOrderStatus')
);

// Fshi porosi (ADMIN)
router.delete(
  '/orders/:id',
  mustBeFn(orderController.deleteOrder, 'orderController.deleteOrder')
);

module.exports = router;

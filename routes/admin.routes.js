const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin');

// Produkte
router.get('/products', authenticateToken, requireAdmin, adminController.getAllProducts);
router.post('/products', authenticateToken, requireAdmin, adminController.createProduct);
router.put('/products/:id', authenticateToken, requireAdmin, adminController.updateProduct);
router.delete('/products/:id', authenticateToken, requireAdmin, adminController.deleteProduct);

// Userat
router.get('/users', authenticateToken, requireAdmin, adminController.getAllUsers);
router.put('/users/:id/block', authenticateToken, requireAdmin, adminController.blockUser);
router.put('/users/:id/role', authenticateToken, requireAdmin, adminController.updateUserRole);
router.delete('/users/:id', authenticateToken, requireAdmin, adminController.deleteUser);

// Orders
router.get('/orders', authenticateToken, requireAdmin, adminController.getAllOrders);

// Stats
router.get('/stats', authenticateToken, requireAdmin, adminController.getStats);

module.exports = router;

// routes/product.routes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin');
const { getAll, getById, create, update, remove } = require('../controllers/product.controller');

// Public routes
router.get('/', getAll);
router.get('/:id', getById);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, create);
router.put('/:id', authenticateToken, requireAdmin, update);
router.delete('/:id', authenticateToken, requireAdmin, remove);

module.exports = router;

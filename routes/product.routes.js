const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const { getAll, getById, create, update, remove } = require('../controllers/product.controller');

// Public routes
router.get('/', getAll);
router.get('/:id', getById);

// Admin routes (mbrojtura)
router.post('/', authenticateToken, create);
router.put('/:id', authenticateToken, update);
router.delete('/:id', authenticateToken, remove);

module.exports = router;

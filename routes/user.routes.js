// routes/user.routes.js
const express = require('express');
const router = express.Router();

// importo middleware-in si default
const authenticateToken = require('../middleware/auth.middleware');

// controller si objekt; do të përdorim getOrdersForUser nga controller-i
const orderController = require('../controllers/order.controller');

// profil i thjeshtë
router.get('/me', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role, email: req.user.email });
});

// porositë e përdoruesit aktiv
router.get('/orders', authenticateToken, orderController.getOrdersForUser);

module.exports = router;

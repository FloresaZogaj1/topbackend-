// routes/user.routes.js
const express = require('express');
const router = express.Router();

// IMPORTO middleware-in SI FUNKSION I VETËM (pa kllapa!)
const authenticateToken = require('../middleware/auth.middleware');

// IMPORTO kontrollorin si objekt dhe PASTAJ merre funksionin
const orderController = require('../controllers/order.controller');

// --- Verifikime të qarta që të mos bjerë Express me error të paqartë ---
if (typeof authenticateToken !== 'function') {
  throw new Error(
    "[user.routes] 'authenticateToken' NUK është funksion. " +
    "Sigurohu që 'middleware/auth.middleware.js' bën module.exports = function (...) { ... } " +
    "dhe importohet me: const authenticateToken = require('../middleware/auth.middleware');"
  );
}

if (!orderController || typeof orderController.getOrdersForUser !== 'function') {
  throw new Error(
    "[user.routes] 'getOrdersForUser' NUK është funksion ose s'eksiston në 'controllers/order.controller.js'. " +
    "Duhet të eksportosh: exports.getOrdersForUser = async (req,res)=>{...} ose module.exports = { getOrdersForUser, ... }."
  );
}

// Handler i thjeshtë për /me: provon auth-in shpejt
const meHandler = (req, res) => {
  return res.json({
    id: req.user.id,
    role: req.user.role,
    email: req.user.email
  });
};

// RUTAT — KUJDES: kalon VETË funksionet (pa i thirrur me kllapa)
router.get('/me', authenticateToken, meHandler);
router.get('/orders', authenticateToken, orderController.getOrdersForUser);

module.exports = router;

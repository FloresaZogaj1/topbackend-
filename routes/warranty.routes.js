// routes/warranty.routes.js
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/requireAdmin');
const ctrl = require('../controllers/warranty.controller');

// vetëm admin
router.use(authenticateToken, requireAdmin);

// krijim nga forma
router.post('/from-form', ctrl.createFromForm);

// listim / detaj / fshirje
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.delete('/:id', ctrl.remove);

module.exports = router;

// routes/warranty.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // for parsing multipart/form-data (no files)


const authenticateToken = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth');
const { requireAdmin } = require('../middleware/requireAdmin');
const ctrl = require('../controllers/warranty.controller');

// Krijim nga forma: lejohet publikisht (ose me optional auth)
// Prano si JSON, x-www-form-urlencoded (global parser) dhe multipart/form-data pa file
router.post('/from-form', upload.none(), optionalAuth, ctrl.createFromForm);

// endpointet admin-only
router.get('/', authenticateToken, requireAdmin, ctrl.list);
router.get('/:id', authenticateToken, requireAdmin, ctrl.getOne);
router.delete('/:id', authenticateToken, requireAdmin, ctrl.remove);
// update (admin)
router.put('/:id', authenticateToken, requireAdmin, ctrl.update);

module.exports = router;

// routes/product.routes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const authenticateToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/requireAdmin');
const { getAll, getById, create, update, remove, uploadOnly } = require('../controllers/product.controller');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '_' + safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (!ok) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

// public
router.get('/', getAll);
router.get('/:id', getById);

// upload-only (kthe url)
router.post('/upload-image', authenticateToken, requireAdmin, upload.single('image'), uploadOnly);

// admin CRUD (pranon ose multipart - me file "image", ose JSON me { image: "url" })
router.post('/', authenticateToken, requireAdmin, upload.single('image'), create);
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), update);
router.patch('/:id', authenticateToken, requireAdmin, upload.single('image'), update);
router.delete('/:id', authenticateToken, requireAdmin, remove);

module.exports = router;

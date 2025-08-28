// routes/product.routes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin');
const { getAll, getById, create, update, remove } = require('../controllers/product.controller');

// === Multer për upload në /uploads ===
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp|gif|svg\+xml)/i.test(file.mimetype);
    cb(ok ? null : new Error('Lejohen vetëm imazhe'));
  }
});

// Public routes
router.get('/', getAll);
router.get('/:id', getById);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, create);
router.put('/:id', authenticateToken, requireAdmin, update);
router.delete('/:id', authenticateToken, requireAdmin, remove);

// === Upload image (Admin) ===
// Kthen { url: "/uploads/<filename>" } për t'u ruajtur te kolona "image"
router.post(
  '/upload-image',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Skedari mungon' });
    // shënim: aplikacioni duhet të servojë static folderin /uploads (shih server.js më poshtë)
    const urlPath = '/uploads/' + req.file.filename;
    res.status(201).json({ url: urlPath, filename: req.file.filename });
  }
);

module.exports = router;

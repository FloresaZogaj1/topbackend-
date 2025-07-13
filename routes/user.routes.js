const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const { profile } = require('../controllers/user.controller');
const pool = require('../db');

// Endpoint për profilin nga databaza (opsional)
router.get('/profile-db', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint për profilin nga JWT
router.get('/profile', authenticateToken, profile);

module.exports = router;

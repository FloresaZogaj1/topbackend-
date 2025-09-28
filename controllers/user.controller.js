// controllers/user.controller.js
const pool = require('../db/index.js'); // unifikuar

async function getAllUsers(_req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error('getAllUsers error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUserById(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('getUserById error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const [r] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [
      role,
      req.params.id,
    ]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('updateUserRole error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteUser(req, res) {
  try {
    const [r] = await pool.query('DELETE FROM users WHERE id = ?', [
      req.params.id,
    ]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteUser error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
};

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

    // Prevent removing last admin
    if (role === 'user') {
      const [[{ admin_count }]] = await pool.query('SELECT COUNT(*) AS admin_count FROM users WHERE role = "admin"');
      const [current] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
      if (current.length && current[0].role === 'admin' && admin_count <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin' });
      }
    }

    const [r] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('updateUserRole error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateUser(req, res) {
  try {
    const { name, email, role } = req.body;
    const fields = [];
    const params = [];
    if (name) { fields.push('name = ?'); params.push(String(name).trim()); }
    if (email) { fields.push('email = ?'); params.push(String(email).trim()); }
    if (role) {
      if (!['admin', 'user'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
      // safeguard for last admin
      if (role === 'user') {
        const [[{ admin_count }]] = await pool.query('SELECT COUNT(*) AS admin_count FROM users WHERE role = "admin"');
        const [current] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
        if (current.length && current[0].role === 'admin' && admin_count <= 1) {
          return res.status(400).json({ message: 'Cannot demote the last admin' });
        }
      }
      fields.push('role = ?'); params.push(role);
    }
    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    params.push(req.params.id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [r] = await pool.query(sql, params);
    if (!r.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('updateUser error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    // Prevent self-delete to avoid locking out
    if (req.user && String(req.user.id) === String(userId)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    // Prevent deleting last admin
    const [targetRows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!targetRows.length) return res.status(404).json({ message: 'Not found' });
    if (targetRows[0].role === 'admin') {
      const [[{ admin_count }]] = await pool.query('SELECT COUNT(*) AS admin_count FROM users WHERE role = "admin"');
      if (admin_count <= 1) return res.status(400).json({ message: 'Cannot delete the last admin' });
    }
    const [r] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
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
  updateUser,
  deleteUser,
};

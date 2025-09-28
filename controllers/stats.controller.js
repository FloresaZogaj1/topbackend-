// controllers/stats.controller.js
const pool = require('../db/index.js'); // unifikuar

exports.getStats = async (_req, res) => {
  try {
    const [[u]] = await pool.query('SELECT COUNT(*) AS users FROM users');
    const [[o]] = await pool.query('SELECT COUNT(*) AS orders FROM orders');
    const [[p]] = await pool.query('SELECT COUNT(*) AS products FROM products');
    res.json({ users: u.users, orders: o.orders, products: p.products });
  } catch (e) {
    console.error('getStats error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

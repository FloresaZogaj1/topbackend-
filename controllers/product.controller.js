// controllers/product.controller.js
const pool = require('../db');

// GET /api/products
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('getAll error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/products/:id
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/products  (Admin only)
exports.create = async (req, res) => {
  const { name, description = "", price, image = "" } = req.body;
  if (!name || price == null) return res.status(400).json({ message: 'Name and price required' });

  try {
    const [result] = await pool.query(
      'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)',
      [name, description, price, image]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/products/:id  (Admin only)
exports.update = async (req, res) => {
  const { name, description = "", price, image = "" } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name=?, description=?, price=?, image=? WHERE id=?',
      [name, description, price, image, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/products/:id  (Admin only)
exports.remove = async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('remove error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

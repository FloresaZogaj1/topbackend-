// controllers/product.controller.js
const pool = require('../db');

// Merr të gjithë produktet
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Merr një produkt sipas id-së
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// (Opsionale: Më vonë) Krijo produkt (për admin)
exports.create = async (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !price) return res.status(400).json({ message: 'Name and price required' });
  try {
    // Kontrollo rolin (opsionale)
    // if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
    await pool.query(
      'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)',
      [name, description, price, image]
    );
    res.status(201).json({ message: 'Product created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// (Opsionale: Më vonë) Update produkti
exports.update = async (req, res) => {
  const { name, description, price, image } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name=?, description=?, price=?, image=? WHERE id=?',
      [name, description, price, image, req.params.id]
    );
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// (Opsionale: Më vonë) Fshij produktin
exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

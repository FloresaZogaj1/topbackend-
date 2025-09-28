// controllers/product.controller.js
const pool = require('../db');

// helper
const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// GET /api/products
async function getAll(_req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, price, description, image FROM products ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('getAll products error:', err);
    res.status(500).json({ message: 'Gabim gjatë marrjes së produkteve.' });
  }
}

// GET /api/products/:id
async function getById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    const [[row]] = await pool.query(
      'SELECT id, name, price, description, image FROM products WHERE id = ? LIMIT 1',
      [id]
    );
    if (!row) return res.status(404).json({ message: 'Produkti nuk u gjet.' });
    res.json(row);
  } catch (err) {
    console.error('getById product error:', err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
}

// POST /api/products   (multipart ose JSON)
async function create(req, res) {
  try {
    const { name, price, description, image } = req.body || {};
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (image || null);

    if (!name) return res.status(400).json({ message: 'Emri është i detyrueshëm.' });

    const [r] = await pool.execute(
      'INSERT INTO products (name, price, description, image) VALUES (?,?,?,?)',
      [name, toNumber(price), description || null, imagePath]
    );

    res.status(201).json({
      id: r.insertId,
      name,
      price: toNumber(price),
      description: description || null,
      image: imagePath
    });
  } catch (err) {
    console.error('create product error:', err);
    res.status(500).json({ message: 'Gabim gjatë krijimit.' });
  }
}

// PUT/PATCH /api/products/:id   (multipart ose JSON)
async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });

    const { name, price, description, image } = req.body || {};
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (image === undefined ? undefined : image || null);

    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (price !== undefined) { fields.push('price = ?'); params.push(toNumber(price)); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description || null); }
    if (imagePath !== undefined) { fields.push('image = ?'); params.push(imagePath); }

    if (!fields.length) return res.status(400).json({ message: 'Asgjë për përditësim.' });

    params.push(id);
    await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Produkti u përditësua.' });
  } catch (err) {
    console.error('update product error:', err);
    res.status(500).json({ message: 'Gabim gjatë përditësimit.' });
  }
}

// DELETE /api/products/:id
async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Produkti u fshi.' });
  } catch (err) {
    console.error('delete product error:', err);
    res.status(500).json({ message: 'Gabim gjatë fshirjes.' });
  }
}

// POST /api/products/upload-image  (kthen vetëm url)
async function uploadOnly(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'S’u dërgua asnjë file' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    console.error('uploadOnly error:', err);
    res.status(500).json({ message: 'Gabim gjatë ngarkimit të imazhit.' });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  uploadOnly,
};

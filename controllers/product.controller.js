// controllers/product.controller.js
const pool = require('../db'); // ose ku e ke DB; nëse s'ke DB, hiqe dhe përdor memorie

// GET /api/products
async function getAll(_req, res) {
  try {
    // shembull DB:
    // const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    const rows = []; // placeholder nëse s'ke DB gati
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
    // const [[row]] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    const row = null; // placeholder
    if (!row) return res.status(404).json({ message: 'Produkti nuk u gjet.' });
    res.json(row);
  } catch (err) {
    console.error('getById product error:', err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
}

// POST /api/products
async function create(req, res) {
  try {
    const { name, price } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name) return res.status(400).json({ message: 'Emri është i detyrueshëm.' });

    // shembull DB:
    // const [r] = await pool.execute(
    //   'INSERT INTO products (name, price, image) VALUES (?,?,?)',
    //   [name, Number(price) || 0, imagePath]
    // );

    res.status(201).json({
      message: 'Produkti u krijua.',
      // id: r.insertId,
      data: { name, price: Number(price) || 0, image: imagePath },
    });
  } catch (err) {
    console.error('create product error:', err);
    res.status(500).json({ message: 'Gabim gjatë krijimit.' });
  }
}

// PUT/PATCH /api/products/:id
async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });

    const { name, price } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

    // shembull DB:
    // const fields = [];
    // const params = [];
    // if (name) { fields.push('name = ?'); params.push(name); }
    // if (price !== undefined) { fields.push('price = ?'); params.push(Number(price) || 0); }
    // if (imagePath !== undefined) { fields.push('image = ?'); params.push(imagePath); }
    // if (!fields.length) return res.status(400).json({ message: 'Asgjë për përditësim.' });
    // params.push(id);
    // await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Produkti u përditësua.', id, data: { name, price: Number(price) || 0, image: imagePath } });
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

    // shembull DB:
    // await pool.execute('DELETE FROM products WHERE id = ?', [id]);

    res.json({ message: 'Produkti u fshi.', id });
  } catch (err) {
    console.error('delete product error:', err);
    res.status(500).json({ message: 'Gabim gjatë fshirjes.' });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

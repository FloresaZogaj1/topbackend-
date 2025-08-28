// controllers/admin.controller.js
const pool = require('../db');

// ===================== PRODUKTET =====================
exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('getAllProducts error:', err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.createProduct = async (req, res) => {
  const { name, price, category } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (name, price, category) VALUES (?, ?, ?)',
      [name, price, category]
    );
    res.json({ message: "Product created" });
  } catch (err) {
    console.error("INSERT ERROR", err);
    res.status(500).json({ message: "Insert error" });
  }
};

exports.updateProduct = async (req, res) => {
  const { name, price, category } = req.body;
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE products SET name=?, price=?, category=? WHERE id=?',
      [name, price, category, id]
    );
    res.json({ message: "Product updated" });
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ message: "Update error" });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id=?', [id]);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ message: "Delete error" });
  }
};

// ===================== USERAT =====================
exports.getAllUsers = async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users');
    res.json(rows);
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.blockUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET blocked=1 WHERE id=?', [id]);
    res.json({ message: "User blocked" });
  } catch (err) {
    console.error('blockUser error:', err);
    res.status(500).json({ message: "Block error" });
  }
};

exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    await pool.query('UPDATE users SET role=? WHERE id=?', [role, id]);
    res.json({ message: "User role updated" });
  } catch (err) {
    console.error('updateUserRole error:', err);
    res.status(500).json({ message: "Role update error" });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id=?', [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: "Delete error" });
  }
};

// ===================== POROSITË =====================
exports.getAllOrders = async (_req, res) => {
  try {
    // Alias për created_at -> createdAt; marrim edhe një fushë items/items_json nëse ekziston
    const [rows] = await pool.query(`
      SELECT 
        id,
        customer_name     AS customerName,
        phone,
        address,
        total,
        status,
        created_at        AS createdAt,
        items             AS itemsRaw,
        items_json        AS itemsJson
      FROM orders
      ORDER BY created_at DESC
    `);

    // Pars-ojmë items në array nëse vjen si string JSON
    const mapped = rows.map(r => {
      let items = r.itemsRaw ?? r.itemsJson ?? r.items ?? null;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { /* leave as-is */ }
      }
      return { ...r, items };
    });

    res.json(mapped);
  } catch (err) {
    console.error('getAllOrders error:', err);
    res.status(500).json({ message: "Database error" });
  }
};

// ===================== STATISTIKAT =====================
exports.getStats = async (_req, res) => {
  try {
    // Totals (siç i kishe)
    const [[{ totalProducts }]] = await pool.query('SELECT COUNT(*) as totalProducts FROM products');
    const [[{ totalUsers }]]    = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalOrders }]]   = await pool.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [[{ totalSales }]]    = await pool.query('SELECT IFNULL(SUM(total), 0) as totalSales FROM orders');

    // Shtojmë edhe shitjet/porositë e SOTME.
    // NOTE: nëse kolona jote quhet createdAt (camelCase), ndrysho emrin në query poshtë.
    const [[today]] = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0) AS sales_today,
        COUNT(*)                AS orders_today
      FROM orders
      WHERE DATE(created_at) = CURDATE()
        AND (status IS NULL OR status <> 'Refuzuar')
    `);

    res.json({
      totalProducts,
      totalUsers,
      totalOrders,
      totalSales: Number(totalSales) || 0,
      sales_today: Number(today?.sales_today ?? 0),
      orders_today: Number(today?.orders_today ?? 0),
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: "Database error" });
  }
};

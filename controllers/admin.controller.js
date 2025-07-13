const pool = require('../db');

// PRODUKTET
exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
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
    console.error("INSERT ERROR", err); // Shto për debug
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
    res.status(500).json({ message: "Update error" });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id=?', [id]);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete error" });
  }
};

// USERAT
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

exports.blockUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET blocked=1 WHERE id=?', [id]);
    res.json({ message: "User blocked" });
  } catch (err) {
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
    res.status(500).json({ message: "Role update error" });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id=?', [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete error" });
  }
};

// POROSITE (ORDERS)
exports.getAllOrders = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

// STATISTIKAT
exports.getStats = async (req, res) => {
  try {
    const [[{ totalProducts }]] = await pool.query('SELECT COUNT(*) as totalProducts FROM products');
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalOrders }]] = await pool.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [[{ totalSales }]] = await pool.query('SELECT IFNULL(SUM(total), 0) as totalSales FROM orders');
    res.json({ totalProducts, totalUsers, totalOrders, totalSales });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

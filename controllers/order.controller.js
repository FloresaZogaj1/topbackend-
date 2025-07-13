const pool = require("../db");

// Shton një porosi të re
exports.createOrder = async (req, res) => {
  // ... kodi jot ekziston këtu ...
};

// Merr të gjitha porositë (për admin)
exports.getAllOrders = async (req, res) => {
  // ... kodi jot ekziston këtu ...
};

// Merr porositë për user-in e loguar
exports.getOrdersForUser = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

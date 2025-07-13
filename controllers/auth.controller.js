const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // përdor bcryptjs që instalohet lehtë me npm
const pool = require('../db'); // lidhu me db.js ose db/index.js sipas strukturës

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }
  try {
    // Kontrollo nëse ekziston email
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    // Kripto passwordin
    const hashedPassword = await bcrypt.hash(password, 10);
    // Shto user-in në db
    await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Kontrollo ekzistencën e user-it
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = rows[0];
    // Kontrollo passwordin
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Gjenero token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role || "user" },
      process.env.JWT_SECRET || 'sekret',
      { expiresIn: '1d' }
    );
    return res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role || "user" }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const secret = process.env.JWT_SECRET || 'sekret';
    // pritet payload: { id, email, role }
    req.user = jwt.verify(token, secret);
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid/expired token' });
  }
};

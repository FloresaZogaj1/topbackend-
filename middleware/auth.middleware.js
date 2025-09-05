// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token, not authorized!' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role, email: decoded.email };
    next();
  } catch (_err) {
    return res.status(401).json({ message: 'Token invalid or expired.' });
  }
};

// middleware/optionalAuth.js
const jwt = require('jsonwebtoken');

module.exports = (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_e) {
    // s’e ndalojmë kërkesën
  }
  next();
};

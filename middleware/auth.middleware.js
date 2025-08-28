const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, not authorized!' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.id || payload.sub,
      email: payload.email,
      role: payload.role || 'user',
      name: payload.name,
    };
    if (!req.user.id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    next();
  } catch (_e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

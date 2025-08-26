// middleware/admin.middleware.js
module.exports = function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Kërkohet admin.' });
};

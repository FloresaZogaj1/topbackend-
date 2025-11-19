// scripts/make_jwt.js
// Small helper to generate a test JWT using the same secret as server (NODE_ENV check ignored)
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'sekret';

const payload = {
  id: 1,
  email: 'admin@example.com',
  role: 'admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '7d' });
console.log(token);

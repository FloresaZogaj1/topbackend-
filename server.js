// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authenticateToken = require('./middleware/auth.middleware');
const { requireAdmin } = require('./middleware/requireAdmin');

const authRoutes = require('./routes/auth.routes');
const adminOrdersRoutes = require('./routes/admin.orders.routes');
const orderRoutes = require('./routes/order.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');

const warrantyRoutes = require('./routes/warranty.routes');
const adminUsersRoutes = require('./routes/admin.users.routes');
const adminStatsRoutes = require('./routes/admin.stats.routes');
const contractsRoutes = require('./routes/contracts.routes'); // ← SHTO KËTË

const app = express();
app.use(express.json());

const allowed = [
  process.env.FRONTEND_URL,
  'https://topmobile.store',
  'https://www.topmobile.store',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true
}));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// log
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} <- origin:${req.headers.origin} host:${req.headers.host}`);
  next();
});


// routes publike / auth
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// “guard” GET për endpoints e login POST
app.get('/api/auth/login', (_req, res) => res.status(405).json({ message: 'Use POST /api/auth/login' }));
app.get('/auth/login', (_req, res) => res.status(405).json({ message: 'Use POST /auth/login' }));

// API publike/user
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
// ✅ health edhe nën /api që të testosh me BASE
app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

// ✅ TEMP FIX: ndal 404 te /api/contracts/softsave që po bjen panelin
app.use('/api/contracts/softsave', authenticateToken, requireAdmin, (req, res) => {
  if (req.method === 'GET')  return res.json([]);                                      // lista bosh (placeholder)
  if (req.method === 'POST') return res.status(201).json({ ok: true, contract_id: Date.now() });
  return res.status(405).json({ message: 'Method Not Allowed' });
});

// Warranty (admin‐only brenda routerit)
app.use('/api/warranty', warrantyRoutes);
app.use('/api/contracts', authenticateToken, requireAdmin, contractsRoutes); // ← SHTO KËTË


// ADMIN – të gjitha nën /api/admin
if (adminOrdersRoutes) {
  app.use('/api/admin', authenticateToken, requireAdmin, adminOrdersRoutes);
}
if (adminUsersRoutes) {
  app.use('/api/admin', authenticateToken, requireAdmin, adminUsersRoutes);
}
if (adminStatsRoutes) {
  app.use('/api/admin', authenticateToken, requireAdmin, adminStatsRoutes);
}

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.send('API running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

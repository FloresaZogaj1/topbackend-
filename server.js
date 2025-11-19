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
const optionalAuth = require('./middleware/optionalAuth');
const contractsController = require('./controllers/contracts.controller');

const app = express();
app.use(express.json());
// Allow classic HTML form posts (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

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

// Warranty (admin‐only brenda routerit)
// Alias: disa thirrje ekzistuese në frontend po dërgohen te /warranty/from-form (pa /api)
// për shkak se REACT_APP_API_URL është vendosur direkt në domain-in e API-së.
// Ruaj /api/warranty si primary, por ekspozo edhe /warranty për createFromForm.
app.use('/api/warranty', warrantyRoutes);
app.use('/warranty', warrantyRoutes); // alias për kompatibilitet (404 fix)
// Admin endpoints për kontrata (listim/shikim) – mbrojtur
app.use('/api/contracts', authenticateToken, requireAdmin, contractsRoutes);
// Alias publik vetëm për krijim kontrate nga forma e klientit
app.post('/contracts/softsave', optionalAuth, contractsController.createSoftSave);


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
const HOST = process.env.HOST || '0.0.0.0';
// Run migrations before starting server
const { runMigrations } = require('./scripts/run_migrations');

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migrations failed on startup, exiting.', err);
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    try {
      const addr = server.address();
      console.log(`🚀 Server running on ${addr.address || '0.0.0.0'}:${addr.port}`);
    } catch (e) {
      console.log(`🚀 Server running on port ${PORT}`);
    }
  });
}

start();

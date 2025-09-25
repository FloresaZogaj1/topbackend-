require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authenticateToken = require('./middleware/auth.middleware');
const { requireAdmin } = require('./middleware/requireAdmin');

const authRoutes = require('./routes/auth.routes');
const adminOrdersRoutes = require('./routes/admin.orders.routes');
const orderRoutes = require('./routes/order.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
app.use(express.json());

// CORS (pa credentials, me lista të lejuara)
const allowed = [
  process.env.FRONTEND_URL,
  'https://topmobile.store',
  'https://www.topmobile.store',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin))
}));

// Log i thjeshtë
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- AUTH ----
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Përgjigje miqësore për GET (mos t’i tregojë HTML default Express)
app.get('/api/auth/login', (_req, res) =>
  res.status(405).json({ message: 'Use POST /api/auth/login' })
);
app.get('/auth/login', (_req, res) =>
  res.status(405).json({ message: 'Use POST /auth/login' })
);

// ---- Rrugë të tjera ----
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);

if (adminOrdersRoutes) {
  app.use('/api/admin', authenticateToken, requireAdmin, adminOrdersRoutes);
}

// Healthcheck
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.send('API running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

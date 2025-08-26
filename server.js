require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const passport = require('./passport');

const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const authenticateToken = require('./middleware/auth.middleware');
const ordersRoutes = require('./routes/orders.routes');
const adminOrdersRoutes = require('./routes/admin.orders.routes');
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://curious-034441.netlify.app',
  'https://zesty-pegasus-9b5fb3.netlify.app',
  'https://topmobile.store',
  'https://www.topmobile.store'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: 'sekret', // në prodhim: përdor ENV dhe secure:true + trust proxy
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

/* ------------------- GOOGLE OAUTH (VENDOSE PARA ROUTER-AVE) ------------------- */
const hasGoogleCreds = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);
console.log('🔎 GOOGLE_OAUTH READY =', hasGoogleCreds, '| CALLBACK =', process.env.GOOGLE_CALLBACK_URL);

// ping për diagnostikë
app.get('/api/auth/google/ping', (_req, res) => {
  res.json({ ok: true, hasGoogleCreds, callback: process.env.GOOGLE_CALLBACK_URL });
});

if (hasGoogleCreds) {
  // Nis login me Google
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // Callback -> JWT -> redirect te frontend
  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' }),
    (req, res) => {
      const u = req.user;
      const token = jwt.sign(
        { sub: u.id, email: u.email, role: u.role || 'user', name: u.name || '' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      const redirect = new URL('/auth/success', process.env.FRONTEND_URL || 'http://localhost:3000');
      redirect.searchParams.set('token', token);
      redirect.searchParams.set('name', u.name || '');
      return res.redirect(redirect.toString());
    }
  );
  const pool = require('./db/index'); // sigurohu që path është i saktë

app.get('/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', db_time: rows[0].time });
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});


  app.get('/api/auth/google/failure', (_req, res) => {
    res.status(401).json({ error: 'Google authentication failed' });
  });
} else {
  app.get('/api/auth/google', (_req, res) =>
    res.status(503).json({ error: 'Google OAuth is disabled (missing env vars).' })
  );
  app.get('/api/auth/google/callback', (_req, res) =>
    res.status(503).json({ error: 'Google OAuth is disabled (missing env vars).' })
  );
}
/* ------------------------------------------------------------------------------ */

/* ----------------------------- ROUTER-AT E TJERË ------------------------------ */
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);          // ⬅️ vjen PAS Google OAuth
app.use('/api/user', userRoutes);
app.use('/api/warranties', require('./routes/warranty.routes'));
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminOrdersRoutes);
/* --------------------------------- TEST/HEALTH -------------------------------- */
app.get('/', (_req, res) => res.send('TopMobile API is running'));
app.get('/test', (_req, res) => res.json({ test: "OK nga server.js" }));
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Ky është një endpoint i mbrojtur!', user: req.user });
});
app.post('/api/test', (req, res) => {
  res.json({ message: 'Test route OK', body: req.body });
});

/* ---------------------------------- START ------------------------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

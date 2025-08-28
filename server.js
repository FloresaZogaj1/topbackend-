require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const jwt = require('jsonwebtoken');
const passport = require('./passport');
const path = require('path');


// Routes & middleware
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const adminOrdersRoutes = require('./routes/admin.orders.routes');
const authenticateToken = require('./middleware/auth.middleware');

// (opsionale) pool për health-check
const pool = require('./db/index');

const app = express();

/* ----------------------------- CORS ----------------------------- */
const allowedOrigins = [
  'http://localhost:3000',
  'https://curious-034441.netlify.app',
  'https://topmobile.store/',
  'https://topmobile.store',
  'https://www.topmobile.store',
  process.env.FRONTEND_URL // p.sh. https://topmobile.store
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
}));

app.use(express.json());

/* ------------------------ SESSION STORE (MySQL) ------------------------ */
// Render është prapa proxy -> e nevojshme që cookie "secure" të ketë efekt
app.set('trust proxy', 1);

// Konfiguro store në Aiven MySQL (SSL pa CA është ok)
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000,
});

app.use(session({
  name: process.env.SESSION_NAME || 'sid',
  secret: process.env.SESSION_SECRET || 'CHANGE_ME_IN_ENV', // mos e lë në kod
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',              // true në Render/HTTPS
    sameSite: (process.env.COOKIE_SAMESITE || 'lax'),           // 'lax' ose 'none' për cross-site
    domain: process.env.SESSION_COOKIE_DOMAIN || '.topmobile.store', // lejon subdomain
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

/* ----------------------- PASSPORT (SESSION) ----------------------- */
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


/* ------------------- GOOGLE OAUTH (para router-ave) ------------------- */
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

/* ------------------------------- ROUTES ------------------------------- */
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes); // ⬅️ vjen PAS Google OAuth
app.use('/api/user', userRoutes);
app.use('/api/warranties', require('./routes/warranty.routes'));
app.use('/api/admin', adminOrdersRoutes);

/* ----------------------------- HEALTH/TEST ---------------------------- */
app.get('/', (_req, res) => res.send('TopMobile API is running'));
app.get('/test', (_req, res) => res.json({ test: "OK nga server.js" }));
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Ky është një endpoint i mbrojtur!', user: req.user });
});
app.post('/api/test', (req, res) => {
  res.json({ message: 'Test route OK', body: req.body });
});

// health-check për DB (opsionale)
app.get('/health/db', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', db_time: rows[0].time });
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/* -------------------------------- START -------------------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

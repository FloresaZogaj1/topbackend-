require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('./passport');
const path = require('path');

const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const adminOrdersRoutes = require('./routes/admin.orders.routes');
const authenticateToken = require('./middleware/auth.middleware');

const pool = require('./db/index');

const app = express();

/* ----------------------------- CORS ----------------------------- */
const allowedOrigins = [
  'http://localhost:3000',
  'https://curious-034441.netlify.app',
  'https://topmobile.store/',
  'https://topmobile.store',
  'https://www.topmobile.store',
  process.env.FRONTEND_URL
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
  allowedHeaders: ['Content-Type', 'Authorization'] // <-- SHTUAR
}));
app.options('*', cors());
app.use(express.json());

/* ------------------------ SESSION STORE (MySQL) ------------------------ */
app.set('trust proxy', 1);

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
  secret: process.env.SESSION_SECRET || 'CHANGE_ME_IN_ENV',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.topmobile.store' : undefined,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

/* ----------------------- PASSPORT (SESSION) ----------------------- */
app.use(passport.initialize());
app.use(passport.session());

app.use((req, _res, next) => { console.log(req.method, req.path); next(); });

/* ------------------- GOOGLE OAUTH PING (diagnostikë) ------------------- */
app.get('/api/auth/google/ping', (_req, res) => {
  const hasGoogleCreds = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL
  );
  res.json({ ok: true, hasGoogleCreds, callback: process.env.GOOGLE_CALLBACK_URL });
});

/* ------------------------------- ROUTES ------------------------------- */
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes); // Google OAuth & login janë këtu
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

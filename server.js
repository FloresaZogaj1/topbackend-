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
const contractRoutes = require("./routes/contracts.routes");

const pool = require('./db/index');

const app = express();
app.use((req, res, next) => {
  const t0 = Date.now();
  const path = req.originalUrl || req.path;
  res.on('finish', () => {
    console.log(`${req.method} ${path} -> ${res.statusCode} ${Date.now()-t0}ms`);
  });
  next();
});


/* ----------------------------- CORS ----------------------------- */
const allowedOrigins = [
  'http://localhost:3000',
  'https://curious-034441.netlify.app',
  'https://topmobile.store',
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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Trajto preflight OPTIONS globalisht (zëvendëson app.options('*', cors()))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
// ↙︎ Vendose PAS app = express() dhe PARA app.use('/api/...')
app.use((req, res, next) => {
  const start = Date.now();
  const { method } = req;
  const path = req.originalUrl || req.path;

  res.on('finish', () => {
    const ms = Date.now() - start;
    // do shohësh p.sh.: POST /api/orders -> 401 4ms
    console.log(`${method} ${path} -> ${res.statusCode} ${ms}ms`);
  });

  next();
});

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
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/warranties', require('./routes/warranty.routes'));
app.use('/api/admin', adminOrdersRoutes);
app.use("/api/contracts", contractRoutes);

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
// 🔚 JSON error handler – gjithmonë JSON, jo HTML
// -------------------------------- ERROR HANDLER (JSON) --------------------------------
app.use((err, req, res, next) => {
  const debug = process.env.DEBUG_ERRORS === 'true';
  const payload = { message: 'Internal server error' };
  if (debug) {
    payload.code = err.code;
    payload.detail = err.sqlMessage || err.message || String(err);
    payload.path = req.path;
  }
  console.error('UNCAUGHT ERROR:', err);
  res.status(500).json(payload);
});


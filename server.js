require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');    // Lart!
const passport = require('./passport');        // Lart!
const adminRoutes = require('./routes/admin.routes');
console.log("RAILWAY ENV:", process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const authenticateToken = require('./middleware/auth.middleware');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// *** SESSIONS DHE PASSPORT PARA RUTAVE! ***
app.use(session({
  secret: 'sekret', 
  resave: false, 
  saveUninitialized: false,
  cookie: { secure: false } // secure: true vetëm me HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/admin', adminRoutes);

// Pastaj routat!
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => {
  res.send('TopMobile API is running');
});
app.get('/test', (req, res) => {
  res.json({ test: "OK nga server.js" });
});


// Shembull endpoint i mbrojtur
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Ky është një endpoint i mbrojtur!', user: req.user });
});

app.post('/api/test', (req, res) => {
  res.json({ message: 'Test route OK', body: req.body });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

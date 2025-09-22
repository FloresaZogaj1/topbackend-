// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authenticateToken = require('./middleware/auth.middleware');
const { requireAdmin } = require('./middleware/requireAdmin');

const adminOrdersRoutes = require('./routes/admin.orders.routes'); // nëse e përdor
const orderRoutes = require('./routes/order.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
app.use(express.json());

// CORS i thjeshtë (ndrysho sipas nevojës)
app.use(cors({ origin: '*', credentials: true }));

// routes
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);

// zona admin (nëse e ke edhe admin.routes tjera, montoji këtu)
if (adminOrdersRoutes) {
  app.use('/api/admin', authenticateToken, requireAdmin, adminOrdersRoutes);
}

app.get('/', (_req, res) => res.send('API running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

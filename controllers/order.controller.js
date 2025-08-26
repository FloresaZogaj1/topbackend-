// controllers/order.controller.js
const pool = require('../db');
const { notifyOrderWA } = require('../services/whatsapp.service');

// Helper për të kthyer camelCase për frontend-in tënd
function mapOrderRowToClient(row, items = []) {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    note: row.note,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    items: items.map(i => ({
      id: i.id,
      productId: i.product_id,
      name: i.name,
      price: Number(i.price),
      qty: i.qty
    }))
  };
}

// POST /api/orders  (krijon porosi + dërgon WA)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const {
      customer_name,
      phone,
      address,
      city,
      note,
      delivery_fee = 0,
      cartItems = []
    } = req.body;

    if (!customer_name || !phone || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Të dhënat e porosisë janë të paplota.' });
    }

    // subtotal nga cartItems
    const subtotal = cartItems.reduce((s, it) => s + Number(it.price) * Number(it.qty || it.quantity || 1), 0);
    const total = subtotal + Number(delivery_fee);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [or] = await conn.execute(
        `INSERT INTO orders
         (user_id, customer_name, phone, address, city, note, subtotal, delivery_fee, total, status, payment_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          userId, customer_name, phone, address || null, city || null, note || null,
          subtotal, delivery_fee, total, 'pending', 'unpaid'
        ]
      );
      const orderId = or.insertId;

      // shto artikujt
      const vals = [];
      const params = [];
      cartItems.forEach(it => {
        const pid = it.product_id ?? it.id ?? null;
        const qty = it.qty ?? it.quantity ?? 1;
        vals.push('(?,?,?,?,?)');
        params.push(orderId, pid, it.name, it.price, qty);
      });

      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, name, price, qty)
         VALUES ${vals.join(',')}`, params
      );

      await conn.commit();

      // Merr të dhënat e order-it për njoftim
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      const orderForMsg = {
        id: orderId,
        customer_name, phone, address, city, note,
        subtotal, delivery_fee, total,
        status: 'Në pritje',
        items
      };

      // Njoftim WhatsApp (jo-bllokues)
      notifyOrderWA(orderForMsg).catch(()=>{});

      return res.status(201).json({ id: orderId, total });
    } catch (e) {
      await conn.rollback();
      console.error(e);
      return res.status(500).json({ message: 'Gabim gjatë krijimit të porosisë.' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
};

// GET /api/admin/orders (lista admin – format që pret frontend-i yt)
exports.getAllOrders = async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY id DESC LIMIT 500');
    if (!orders.length) return res.json([]);

    // Nxjerr artikujt në një query
    const ids = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemsByOrder = items.reduce((acc, it) => {
      acc[it.order_id] = acc[it.order_id] || [];
      acc[it.order_id].push(it);
      return acc;
    }, {});

    const out = orders.map(o => mapOrderRowToClient(o, itemsByOrder[o.id] || []));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gabim gjatë marrjes së porosive.' });
  }
};

// GET /api/orders/my (porositë e user-it të loguar)
exports.getOrdersForUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    if (!orders.length) return res.json([]);

    const ids = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemsByOrder = items.reduce((acc, it) => {
      acc[it.order_id] = acc[it.order_id] || [];
      acc[it.order_id].push(it);
      return acc;
    }, {});

    const out = orders.map(o => mapOrderRowToClient(o, itemsByOrder[o.id] || []));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/orders/:id  (ndrysho statusin ose payment_status)
exports.updateOrderAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    if (!status && !payment_status) {
      return res.status(400).json({ message: 'Asgjë për përditësim.' });
    }

    const fields = [];
    const params = [];
    if (status) { fields.push('status = ?'); params.push(status); }
    if (payment_status) { fields.push('payment_status = ?'); params.push(payment_status); }
    params.push(id);

    await pool.execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'U përditësua.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gabim gjatë update.' });
  }
};

// DELETE /api/admin/orders/:id
exports.deleteOrderAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'U fshi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gabim gjatë fshirjes.' });
  }
};

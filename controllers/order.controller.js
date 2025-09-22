// controllers/order.controller.js
const pool = require('../db');

// =============== Helpers ===============
const toStr = (v) => (v === undefined || v === null) ? '' : String(v);
const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const parsePrice = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const slugify = (s) => String(s ?? '')
  .trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 64);

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
      qty: i.qty,
    })),
  };
}

// =============== CREATE (PUBLIC) ===============
async function createOrder(req, res) {
  try {
    const userId = req.user?.id || null;

    const customer_name = toStr(
      req.body.customer_name || req.body.customerName || req.body.fullName || req.body.name
    ).trim();
    const phone = toStr(req.body.phone).trim();
    const address = toStr(req.body.address);
    const city = toStr(req.body.city);
    const note = toStr(req.body.note);

    // prano delivery_fee ose shippingCost
    const delivery_fee = toNum(req.body.delivery_fee ?? req.body.shippingCost ?? 0);

    const rawItems = Array.isArray(req.body.cartItems || req.body.items)
      ? (req.body.cartItems || req.body.items)
      : [];

    if (!customer_name || !phone || rawItems.length === 0) {
      return res.status(400).json({ message: 'Të dhënat e porosisë janë të paplota.' });
    }

    const safeItems = [];
    for (const [idx, it] of rawItems.entries()) {
      const name = toStr(it?.name || it?.title || it?.productName || it?.model || '');
      const pidCandidate = it?.product_id ?? it?.productId ?? it?.id ?? it?.sku ?? it?.slug ?? it?.code ?? it?._id ?? '';
      let pid = slugify(pidCandidate || name);
      if (!pid) pid = `auto-${Date.now()}-${idx}`;

      const qty = Number(it?.qty ?? it?.quantity ?? 1);
      const price = parsePrice(it?.price);

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Sasia duhet të jetë ≥ 1.' });
      }
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: 'Çmimi i pavlefshëm.' });
      }
      safeItems.push({ pid, name: name || `#${pid}`, qty, price });
    }

    const subtotal = Number(safeItems.reduce((s, it) => s + it.price * it.qty, 0).toFixed(2));
    const total = Number((subtotal + delivery_fee).toFixed(2));

    const STATUS_DEFAULT = process.env.ORDER_STATUS_DEFAULT || 'pending';
    const PAY_STATUS_DEFAULT = process.env.PAYMENT_STATUS_DEFAULT || 'unpaid';

    const conn = await pool.getConnection();
    let orderId;
    try {
      await conn.beginTransaction();

      const [or] = await conn.execute(
        `INSERT INTO orders
         (user_id, customer_name, phone, address, city, note, subtotal, delivery_fee, total, status, payment_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [userId, customer_name, phone, address, city, note, subtotal, delivery_fee, total, STATUS_DEFAULT, PAY_STATUS_DEFAULT]
      );
      orderId = or.insertId;

      if (safeItems.length) {
        const rows = safeItems.map(() => '(?,?,?,?,?)').join(',');
        const params = [];
        for (const it of safeItems) params.push(orderId, it.pid, it.name, it.price, it.qty);
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES ${rows}`,
          params
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      console.error('[createOrder] SQL ERROR:', e);
      return res.status(500).json({ message: 'Gabim gjatë krijimit të porosisë.', detail: e.sqlMessage || e.message });
    } finally {
      conn.release();
    }

    // njoftim opsional (mos le të bjerë nëse mungon)
    try {
      const svc = require('../services/whatsapp.service');
      if (svc && typeof svc.notifyOrderWA === 'function') {
        svc.notifyOrderWA({
          id: orderId,
          customer_name, phone, address, city, note,
          subtotal, delivery_fee, total, status: STATUS_DEFAULT,
          items: safeItems
        }).catch(() => {});
      }
    } catch (_) {}

    return res.status(201).json({ message: 'Porosia u krijua', id: orderId, total });
  } catch (err) {
    console.error('createOrder top error:', err);
    return res.status(500).json({ message: 'Gabim serveri.' });
  }
}

// =============== USER (JWT) ===============
async function getMyOrders(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [userId]);
    if (!orders.length) return res.json([]);

    const ids = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemsByOrder = items.reduce((acc, it) => ((acc[it.order_id] = acc[it.order_id] || []).push(it), acc), {});
    res.json(orders.map(o => mapOrderRowToClient(o, itemsByOrder[o.id] || [])));
  } catch (err) {
    console.error('getMyOrders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getOrderById(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid order id' });

    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    return res.json(mapOrderRowToClient(order, items));
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// =============== ADMIN (JWT + ADMIN) ===============
async function getAllOrders(_req, res) {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(orders);
  } catch (err) {
    console.error('getAllOrders error:', err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const fields = [];
    const params = [];
    if (status) { fields.push('status = ?'); params.push(status); }
    if (payment_status) { fields.push('payment_status = ?'); params.push(payment_status); }
    if (!fields.length) return res.status(400).json({ message: 'Asgjë për përditësim.' });

    params.push(id);
    await pool.execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Order updated' });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ message: 'Error updating order' });
  }
}

async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    res.status(500).json({ message: 'Error deleting order' });
  }
}

module.exports = {
  // public
  createOrder,

  // user
  getMyOrders,
  getOrderById,

  // admin
  getAllOrders,
  updateOrderStatus,
  deleteOrder,

  // alias i vjetër nëse diku përdoret
  updateOrderAdmin: updateOrderStatus,
  deleteOrderAdmin: deleteOrder,

  // përputhje me user.routes nëse kërkon emrin e vjetër:
  getOrdersForUser: getMyOrders,
};

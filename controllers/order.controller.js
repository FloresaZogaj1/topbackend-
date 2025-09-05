// controllers/order.controller.js
const pool = require('../db');
const { notifyOrderWA } = require('../services/whatsapp.service');

// helpers
const toStr = (v) => (v === undefined || v === null) ? '' : String(v);
const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

// parse i çmimit (heq €/presje dhe kthen Number)
const parsePrice = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

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

/* --------------------------------- CREATE (requires login) --------------------------------- */
async function createOrder(req, res) {
  try {
    // kërko login
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Duhet të jesh i kyçur...' });
    }
    const userId = req.user.id;

    // lexo fushat (tolerante për NULL/undefined)
    const customer_name = toStr(
      req.body.customer_name || req.body.customerName || req.body.fullName || req.body.name
    ).trim();
    const phone   = toStr(req.body.phone).trim();
    const address = toStr(req.body.address);
    const city    = toStr(req.body.city);
    const note    = toStr(req.body.note);

    const delivery_fee = toNum(req.body.delivery_fee ?? req.body.shippingCost ?? 0);

    const rawItems = Array.isArray(req.body.cartItems || req.body.items)
      ? (req.body.cartItems || req.body.items)
      : [];

    if (!customer_name || !phone || rawItems.length === 0) {
      return res.status(400).json({ message: 'Të dhënat e porosisë janë të paplota.' });
    }

    // Validim artikujsh (ID numerik >0, qty >=1, price >=0)
    const safeItems = [];
    for (const it of rawItems) {
      const rawPid = it.product_id ?? it.productId ?? it.id;
      const pid = Number.isInteger(Number(rawPid)) ? Number(rawPid) : NaN;
      const qty = Number(it.qty ?? it.quantity ?? 1);
      const price = parsePrice(it.price);

      if (!Number.isInteger(pid) || pid <= 0) {
        return res.status(400).json({ message: 'productId i pavlefshëm.' });
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Sasia duhet të jetë ≥ 1.' });
      }
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: 'Çmimi i pavlefshëm.' });
      }

      const name = (it.name || it.title || `#${pid}`).toString();
      safeItems.push({ pid, qty, price, name });
    }

    const subtotal = safeItems.reduce((s, it) => s + it.price * it.qty, 0);
    const total = subtotal + delivery_fee;

    // statuset default (përputhi me DB; nëse ke ENUM përdor 'pending')
    const STATUS_DEFAULT = process.env.ORDER_STATUS_DEFAULT || 'pending';
    const PAY_STATUS_DEFAULT = process.env.PAYMENT_STATUS_DEFAULT || 'unpaid';

    const conn = await pool.getConnection();
    let orderId;
    try {
      await conn.beginTransaction();

      const cols = [
        'user_id', 'customer_name', 'phone', 'address', 'city', 'note',
        'subtotal', 'delivery_fee', 'total', 'status', 'payment_status'
      ];
      const vals = [
        userId, customer_name, phone, address, city, note,
        subtotal, delivery_fee, total, STATUS_DEFAULT, PAY_STATUS_DEFAULT
      ];

      const placeholders = cols.map(() => '?').join(',');
      const sql = `INSERT INTO orders (${cols.join(',')}) VALUES (${placeholders})`;
      const [or] = await conn.execute(sql, vals);
      orderId = or.insertId;

      if (safeItems.length) {
        const rowPlaceholders = safeItems.map(() => '(?,?,?,?,?)').join(',');
        const params = [];
        for (const it of safeItems) {
          params.push(orderId, it.pid, it.name, it.price, it.qty);
        }
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, name, price, qty)
           VALUES ${rowPlaceholders}`,
          params
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      console.error('[createOrder] SQL ERROR:', {
        code: e.code, errno: e.errno, sqlState: e.sqlState,
        sql: e.sql, sqlMessage: e.sqlMessage
      });
      return res.status(500).json({
        message: 'Gabim gjatë krijimit të porosisë.',
        code: e.code,
        detail: e.sqlMessage || e.message
      });
    } finally {
      conn.release();
    }

    // best-effort njoftim (mos e blloko rrjedhën)
    notifyOrderWA({
      id: orderId, customer_name, phone, address, city, note,
      subtotal, delivery_fee, total, status: STATUS_DEFAULT,
      items: safeItems
    }).catch(() => {});

    return res.status(201).json({ message: 'Porosia u krijua', id: orderId, total });
  } catch (err) {
    console.error('createOrder top error:', err);
    return res.status(500).json({ message: 'Gabim serveri.' });
  }
}

/* --------------------------------- LIST ALL (admin) --------------------------------- */
async function getAllOrders(_req, res) {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY id DESC LIMIT 500');
    if (!orders.length) return res.json([]);
    const ids = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemsByOrder = items.reduce((acc, it) => {
      (acc[it.order_id] = acc[it.order_id] || []).push(it);
      return acc;
    }, {});
    const out = orders.map(o => mapOrderRowToClient(o, itemsByOrder[o.id] || []));
    res.json(out);
  } catch (err) {
    console.error('getAllOrders error:', err);
    res.status(500).json({ message: 'Gabim gjatë marrjes së porosive.' });
  }
}

/* --------------------------------- LIST FOR USER --------------------------------- */
async function getOrdersForUser(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    if (!orders.length) return res.json([]);

    const ids = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const itemsByOrder = items.reduce((acc, it) => {
      (acc[it.order_id] = acc[it.order_id] || []).push(it);
      return acc;
    }, {});
    const out = orders.map(o => mapOrderRowToClient(o, itemsByOrder[o.id] || []));
    res.json(out);
  } catch (err) {
    console.error('getOrdersForUser error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* --------------------------------- ADMIN UPDATE --------------------------------- */
async function updateOrderAdmin(req, res) {
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
    console.error('updateOrderAdmin error:', err);
    res.status(500).json({ message: 'Gabim gjatë update.' });
  }
}

/* --------------------------------- ADMIN DELETE --------------------------------- */
async function deleteOrderAdmin(req, res) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'U fshi.' });
  } catch (err) {
    console.error('deleteOrderAdmin error:', err);
    res.status(500).json({ message: 'Gabim gjatë fshirjes.' });
  }
}

/* --------------------------------- EXPORTS --------------------------------- */
module.exports = {
  createOrder,
  getAllOrders,
  getOrdersForUser,
  updateOrderAdmin,
  deleteOrderAdmin
};

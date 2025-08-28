const pool = require('../db');
const { notifyOrderWA } = require('../services/whatsapp.service');

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

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    // prano të dy formatet nga fronti
    const customer_name = req.body.customer_name || req.body.customerName || req.body.fullName || req.body.name;
    const phone        = req.body.phone;
    const address      = req.body.address || null;
    const city         = req.body.city || null;
    const note         = req.body.note || null;

    const delivery_fee = Number(
      req.body.delivery_fee ?? req.body.shippingCost ?? 0
    );

    const cartItems    = req.body.cartItems || req.body.items || [];

    if (!customer_name || !phone || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Të dhënat e porosisë janë të paplota.' });
    }

    const subtotal = cartItems.reduce((s, it) =>
      s + Number(it.price) * Number(it.qty ?? it.quantity ?? 1), 0);
    const total = subtotal + delivery_fee;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [or] = await conn.execute(
        `INSERT INTO orders
         (user_id, customer_name, phone, address, city, note, subtotal, delivery_fee, total, status, payment_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [userId, customer_name, phone, address, city, note, subtotal, delivery_fee, total, 'pending', 'unpaid']
      );
      const orderId = or.insertId;

      if (cartItems.length) {
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
      }

      await conn.commit();

      notifyOrderWA({
        id: orderId,
        customer_name, phone, address, city, note,
        subtotal, delivery_fee, total,
        status: 'Në pritje',
        items: cartItems
      }).catch(()=>{});

      return res.status(201).json({ message: 'Porosia u krijua', id: orderId, total });
    } catch (e) {
      await conn.rollback();
      console.error('createOrder tx error:', e);
      return res.status(500).json({ message: 'Gabim gjatë krijimit të porosisë.' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('createOrder top error:', err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
};

exports.getAllOrders = async (_req, res) => {
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
    console.error(err);
    res.status(500).json({ message: 'Gabim gjatë marrjes së porosive.' });
  }
};

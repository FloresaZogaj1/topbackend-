const pool = require('../db');

const monthsFromText = (txt) => {
  const m = String(txt || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

// KRIJO nga forma (nga /warranty)
exports.createFromForm = async (req, res) => {
  const {
    emri, mbiemri, telefoni, email,
    marka, modeli, imei, softInfo,
    kohezgjatja, cmimi, data, komente,
    llojiPageses
  } = req.body;

  if (!emri || !mbiemri || !marka || !modeli || !imei || !kohezgjatja || !cmimi || !data) {
    return res.status(400).json({ message: 'Fusha të detyrueshme mungojnë.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // gjej ose krijo klientin
    let customerId = null;
    if (email) {
      const [r] = await conn.query('SELECT id FROM customers WHERE email=? LIMIT 1', [email]);
      if (r.length) customerId = r[0].id;
    }
    if (!customerId && telefoni) {
      const [r] = await conn.query('SELECT id FROM customers WHERE phone=? LIMIT 1', [telefoni]);
      if (r.length) customerId = r[0].id;
    }
    if (!customerId) {
      const [ins] = await conn.query(
        'INSERT INTO customers (first_name,last_name,phone,email) VALUES (?,?,?,?)',
        [emri, mbiemri, telefoni || null, email || null]
      );
      customerId = ins.insertId;
    } else {
      await conn.query(
        'UPDATE customers SET first_name=?, last_name=?, phone=IFNULL(?,phone), email=IFNULL(?,email) WHERE id=?',
        [emri, mbiemri, telefoni || null, email || null, customerId]
      );
    }

    // ruaj garancionin
    const duration = monthsFromText(kohezgjatja);
    const price = Number(String(cmimi).replace(',', '.'));

    const [w] = await conn.query(
      `INSERT INTO warranties
       (customer_id, brand, model, imei, software_info, duration_months, price, start_date, payment_type, comments, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        customerId, marka, modeli, imei, softInfo || null, duration,
        price, data, llojiPageses || 'Cash', komente || null, req.user.id
      ]
    );

    await conn.commit();
    res.json({ ok: true, warranty_id: w.insertId, customer_id: customerId });
  } catch (err) {
    await conn.rollback();
    console.error('createFromForm error', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// LISTO të gjitha garancionet me klient (admin)
exports.list = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.id, w.created_at, w.brand, w.model, w.imei, w.duration_months, w.price, w.start_date, w.payment_type, w.comments,
              c.first_name, c.last_name, c.phone, c.email
       FROM warranties w
       JOIN customers c ON c.id = w.customer_id
       ORDER BY w.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('warranty.list error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// MERR një garancion
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, c.first_name, c.last_name, c.phone, c.email
       FROM warranties w
       JOIN customers c ON c.id = w.customer_id
       WHERE w.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Nuk u gjet' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// FSHIJ një garancion
exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM warranties WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

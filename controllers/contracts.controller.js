// controllers/contracts.controller.js
const pool = require('../db');

// Helper për të kthyer numra në mënyrë të sigurt
const toNum = (v, d = 0) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : d;
};

// CREATE  POST /api/contracts/softsave
exports.createSoftSave = async (req, res) => {
  try {
    const {
      emri, mbiemri, telefoni, email,
      marka, modeli, imei,
      pajisja,        // opsional: p.sh. "iPhone / Laptop", nëse fronti e dërgon
      cmimi, llojiPageses,  // "Cash", "Card", etj.
      data,           // ISO date "YYYY-MM-DD"
      komente         // opsional
    } = req.body || {};

    if (!emri || !mbiemri || !imei || !data) {
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

      // ruaj kontratën
      const [k] = await conn.query(
        `INSERT INTO contracts_softsave
         (customer_id, device_brand, device_model, device_name, imei, price, payment_type, start_date, notes, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          customerId,
          marka || null,
          modeli || null,
          pajisja || null,
          imei,
          toNum(cmimi),
          llojiPageses || 'Cash',
          data,
          komente || null,
          req.user?.id || null
        ]
      );

      await conn.commit();
      res.status(201).json({ ok: true, contract_id: k.insertId, customer_id: customerId });
    } catch (err) {
      await conn.rollback();
      console.error('createSoftSave error', err);
      res.status(500).json({ message: 'Server error' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('createSoftSave top error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// LIST  GET /api/contracts/softsave
exports.listSoftSave = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.start_date, s.device_name, s.device_brand, s.device_model, s.imei,
              s.price, s.payment_type, s.notes,
              c.first_name, c.last_name, c.phone, c.email
       FROM contracts_softsave s
       JOIN customers c ON c.id = s.customer_id
       ORDER BY s.start_date DESC, s.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('listSoftSave error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ONE  GET /api/contracts/softsave/:id
exports.getSoftSave = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });

    const [rows] = await pool.query(
      `SELECT s.*, c.first_name, c.last_name, c.phone, c.email
       FROM contracts_softsave s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Nuk u gjet' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getSoftSave error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

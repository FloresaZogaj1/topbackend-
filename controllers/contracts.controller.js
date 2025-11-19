// controllers/contracts.controller.js
const pool = require('../db');

// Helper për të kthyer numra në mënyrë të sigurt
const toNum = (v, d = 0) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : d;
};

// CREATE  POST /api/contracts/softsave
// This handler is resilient to DB schemas that may or may not include a customer_id column
let _contractsHasCustomerId = null;
async function contractsHasCustomerId() {
  if (_contractsHasCustomerId !== null) return _contractsHasCustomerId;
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'contracts_softsave' AND column_name = 'customer_id'`
    );
    _contractsHasCustomerId = !!(rows && rows[0] && rows[0].cnt);
  } catch (err) {
    console.warn('Could not check contracts_softsave columns:', err.message || err);
    _contractsHasCustomerId = false;
  }
  return _contractsHasCustomerId;
}

exports.createSoftSave = async (req, res) => {
  try {
    console.log('[contracts.createSoftSave] incoming body:', JSON.stringify(req.body));
    // Lejome payload të vjetër nga frontend (firstName, lastName, brand, model, version, payType, date) dhe struktura e re
    const body = req.body || {};
    const emri = body.emri || body.firstName || body.first_name || '';
    const mbiemri = body.mbiemri || body.lastName || body.last_name || '';
    const telefoni = body.telefoni || body.phone || null;
    const email = body.email || null;
    const marka = body.marka || body.brand || body.device_brand || null;
    const modeli = body.modeli || body.model || body.device_model || null;
    const imei = body.imei || null;
    const pajisja = body.pajisja || body.version || body.device_name || null;
    const cmimi = body.cmimi || body.price || null;
    const llojiPageses = body.llojiPageses || body.payType || body.payment_type || 'Cash';
    const data = body.data || body.date || body.start_date || new Date().toISOString().slice(0,10);
    const komente = body.komente || body.notes || null;

    if (!emri || !mbiemri || !imei || !data) {
      return res.status(400).json({ message: 'Fusha të detyrueshme mungojnë.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // find or create customer (defensive)
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
        // Inspect customers table to safely insert only supported/nullable columns
        const [cols] = await conn.query(
          "SELECT COLUMN_NAME AS column_name, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers'"
        );
        const colInfo = {};
        for (const c of cols) colInfo[c.column_name] = { is_nullable: c.is_nullable, column_default: c.column_default };

        // mapping from our incoming fields to customers table columns
        const mapping = [
          ['first_name', emri],
          ['last_name', mbiemri],
          ['phone', telefoni],
          ['email', email]
        ];

        const insertCols = [];
        const insertVals = [];
        let cannotCreateCustomer = false;

        for (const [col, val] of mapping) {
          if (!colInfo[col]) continue; // column doesn't exist in this DB schema
          if (val != null && String(val).trim() !== '') {
            insertCols.push('`' + col + '`');
            insertVals.push(val);
            continue;
          }
          // no value provided
          const info = colInfo[col];
          if (info.is_nullable === 'YES' || info.column_default != null) {
            // safe to insert NULL or skip
            continue;
          }
          // column exists and is NOT NULL with no default -> we cannot create customer safely
          cannotCreateCustomer = true;
          break;
        }

        if (!cannotCreateCustomer && insertCols.length) {
          const sql = `INSERT INTO customers (${insertCols.join(',')}) VALUES (${insertCols.map(_=> '?').join(',')})`;
          const [ins] = await conn.query(sql, insertVals);
          customerId = ins.insertId;
        } else if (!cannotCreateCustomer && insertCols.length === 0) {
          // No mapped columns exist or no values to insert; skip creating customer
          customerId = null;
        } else {
          // cannot create customer because required columns are missing values
          console.warn('[contracts.createSoftSave] Skipping customer creation: required customer columns missing values for this schema');
          customerId = null;
        }
      } else {
        // existing customer: attempt safe update of available columns
        try {
          const updates = [];
          const params = [];
          if (emri) { updates.push('first_name=?'); params.push(emri); }
          if (mbiemri) { updates.push('last_name=?'); params.push(mbiemri); }
          if (telefoni) { updates.push('phone=IFNULL(?,phone)'); params.push(telefoni); }
          if (email) { updates.push('email=IFNULL(?,email)'); params.push(email); }
          if (updates.length) {
            params.push(customerId);
            await conn.query(`UPDATE customers SET ${updates.join(', ')} WHERE id=?`, params);
          }
        } catch (err) {
          console.warn('[contracts.createSoftSave] safe customer update failed', err.message || err);
        }
      }

      // Inspect actual columns on contracts_softsave to avoid missing NOT NULL columns
      const [tableCols] = await conn.query(
        `SELECT COLUMN_NAME AS column_name, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default, COLUMN_TYPE AS column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'contracts_softsave' ORDER BY ordinal_position`
      );
      // defensive: ensure rows are well-formed
      if (!Array.isArray(tableCols)) {
        throw new Error('Unexpected information_schema response for contracts_softsave');
      }
  console.log('[contracts.createSoftSave] contracts_softsave columns:', tableCols.map(c => (c && c.column_name) || null));
  if (tableCols.length) console.log('[contracts.createSoftSave] first column raw:', JSON.stringify(tableCols[0]));
      const commonValues = {
        customer_id: customerId,
        contract_no: `C-${Date.now()}`,
        first_name: emri || '',
        last_name: mbiemri || '',
        phone: telefoni || null,
        email: email || null,
        device_brand: marka || null,
        device_model: modeli || null,
        device_name: pajisja || null,
        imei: imei || null,
        price: toNum(cmimi),
        payment_type: llojiPageses || 'Cash',
        start_date: data || null,
        notes: komente || null,
        created_by: req.user?.id || null
      };

      const insertCols = [];
      const insertVals = [];
      for (const col of tableCols) {
        if (!col || !col.column_name) continue;
        const name = col.column_name;
        if (name === 'id' || name === 'created_at') continue; // auto-generated
        let val = commonValues.hasOwnProperty(name) ? commonValues[name] : null;
        if ((val === null || val === undefined) && String(col.is_nullable) === 'NO' && col.column_default == null) {
          // supply sensible defaults based on type
          const t = (col.column_type || col.COLUMN_TYPE || '').toLowerCase();
          if (name === 'contract_no') val = `C-${Date.now()}`;
          else if (t.startsWith('int') || t.startsWith('decimal') || t.startsWith('bigint') || t.startsWith('tinyint')) val = 0;
          else if (t.startsWith('varchar') || t.startsWith('text') || name.includes('name') || name.includes('phone') || name.includes('email')) val = '';
          else if (t.startsWith('date') || t.startsWith('timestamp')) val = new Date().toISOString().slice(0,10);
          else val = null; // as last resort
        }
        // If column exists but we still have undefined and it's nullable, set NULL
        insertCols.push('`' + name + '`');
        insertVals.push(val);
      }

      if (insertCols.length === 0) throw new Error('No writable columns found on contracts_softsave');
      const placeholders = insertCols.map(_ => '?').join(',');
      const sql = `INSERT INTO contracts_softsave (${insertCols.join(',')}) VALUES (${placeholders})`;
      const [insertResult] = await conn.query(sql, insertVals);

      await conn.commit();
      res.status(201).json({ ok: true, contract_id: insertResult.insertId, customer_id: customerId });
    } catch (err) {
      await conn.rollback();
      console.error('createSoftSave error', err);
      const payload = { message: 'Server error' };
      if (process.env.NODE_ENV !== 'production') { payload.error = err.message; payload.stack = err.stack; }
      res.status(500).json(payload);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('createSoftSave top error', err);
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') { payload.error = err.message; payload.stack = err.stack; }
    res.status(500).json(payload);
  }
};

// LIST  GET /api/contracts/softsave
exports.listSoftSave = async (_req, res) => {
  try {
    const hasCustomerId = await contractsHasCustomerId();
    if (hasCustomerId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.contract_no, s.start_date, s.device_name, s.device_brand, s.device_model, s.imei,
                s.price, s.payment_type, s.notes,
                c.first_name, c.last_name, c.phone, c.email
         FROM contracts_softsave s
         LEFT JOIN customers c ON c.id = s.customer_id
         ORDER BY s.start_date DESC, s.id DESC`
      );
      return res.json(rows);
    }

    // Fallback: table has no customer_id column — return contract rows and null customer fields
    const [rows] = await pool.query(
      `SELECT s.id, s.contract_no, s.start_date, s.device_name, s.device_brand, s.device_model, s.imei,
              s.price, s.payment_type, s.notes
       FROM contracts_softsave s
       ORDER BY s.start_date DESC, s.id DESC`
    );
    // map to expected shape with empty customer fields
    const mapped = rows.map(r => ({
      ...r,
      first_name: null,
      last_name: null,
      phone: null,
      email: null
    }));
    res.json(mapped);
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

    const hasCustomerId = await contractsHasCustomerId();
    if (hasCustomerId) {
      const [rows] = await pool.query(
        `SELECT s.*, c.first_name, c.last_name, c.phone, c.email
         FROM contracts_softsave s
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.id = ?`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ message: 'Nuk u gjet' });
      return res.json(rows[0]);
    }

    // Fallback: no customer_id column — select contract only and synthesize null customer fields
    const [rows] = await pool.query(
      `SELECT s.* FROM contracts_softsave s WHERE s.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Nuk u gjet' });
    const out = { ...rows[0], first_name: null, last_name: null, phone: null, email: null };
    res.json(out);
  } catch (err) {
    console.error('getSoftSave error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE  PUT /api/contracts/softsave/:id
exports.updateSoftSave = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });

    const body = req.body || {};
    const fields = {
      first_name: body.emri || body.firstName || body.first_name,
      last_name: body.mbiemri || body.lastName || body.last_name,
      device_brand: body.marka || body.brand,
      device_model: body.modeli || body.model,
      device_name: body.pajisja || body.version,
      imei: body.imei,
      payment_type: body.llojiPageses || body.payType || body.payment_type,
      start_date: body.data || body.date || body.start_date,
      notes: body.komente || body.notes
    };

    // Build dynamic SET clause only for provided non-undefined keys
    const setParts = [];
    const params = [];
    for (const [col, val] of Object.entries(fields)) {
      if (val === undefined) continue;
      setParts.push(`${col}=?`);
      params.push(val === '' ? null : val); // treat empty string as NULL
    }
    if (!setParts.length) return res.status(400).json({ message: 'Ska fusha për përditësim.' });
    params.push(id);

    const [r] = await pool.query(`UPDATE contracts_softsave SET ${setParts.join(', ')} WHERE id=?`, params);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Nuk u gjet.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('updateSoftSave error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE  DELETE /api/contracts/softsave/:id
exports.deleteSoftSave = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    const [r] = await pool.query(`DELETE FROM contracts_softsave WHERE id=?`, [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Nuk u gjet.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteSoftSave error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

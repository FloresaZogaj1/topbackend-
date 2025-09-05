const pool = require("../db");

exports.createSoftSave = async (req, res) => {
  try {
    const { firstName, lastName, brand, model, version, imei, payType, date } = req.body;
    if (!firstName || !lastName || !brand || !model || !/^\d{14}$/.test(imei) || !payType || !date) {
      return res.status(400).json({ message: "Payload i pavlefshëm" });
    }

    // 1) sekuenca
    const [seq] = await pool.query("INSERT INTO _seq_softsave () VALUES ()");
    const n = seq.insertId;
    const contractNo = `TM-SS-${String(n).padStart(8, "0")}`;

    // 2) insert
    const [r] = await pool.query(
      `INSERT INTO contracts_softsave
       (contract_no, first_name, last_name, brand, model, version, imei, pay_type, date_signed)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [contractNo, firstName, lastName, brand, model, version || null, imei, payType, date]
    );

    return res.status(201).json({ id: r.insertId, contract_no: contractNo });
  } catch (err) {
    console.error("createSoftSave error:", err);
    return res.status(500).json({ message: "DB error", code: err.code, detail: err.sqlMessage || err.message });
  }
};

exports.listSoftSave = async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, contract_no, first_name, last_name, brand, model, imei, pay_type, date_signed
     FROM contracts_softsave ORDER BY id DESC LIMIT 300`
  );
  res.json(rows);
};

exports.getSoftSave = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, contract_no, first_name, last_name, brand, model, version, imei, pay_type, date_signed
     FROM contracts_softsave WHERE id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: "Nuk u gjet" });
  res.json(rows[0]);
};

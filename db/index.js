const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const isTrue = (v) => String(v).toLowerCase() === 'true';

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'topmobile',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL || '10', 10),
  queueLimit: 0,
};

// SSL për Aiven (prod)
if (isTrue(process.env.DB_SSL)) {
  const caPath = process.env.DB_CA_PATH && path.resolve(process.env.DB_CA_PATH);
  cfg.ssl = caPath
    ? { ca: fs.readFileSync(caPath, 'utf8'), minVersion: 'TLSv1.2' } // me CA
    : { minVersion: 'TLSv1.2', rejectUnauthorized: false };          // fallback dev
}

const pool = mysql.createPool(cfg);

// Self-test
(async () => {
  try {
    const [[info]] = await pool.query('SELECT DATABASE() AS db, @@hostname AS host, NOW() AS now');
    console.log(`✅ MySQL connected → ${info.db} @ ${info.host}  ${info.now}`);
  } catch (err) {
    console.error('❌ MySQL connect/query failed:', err.code, err.message);
  }
})();

module.exports = pool;

// test_connection.js - skript i thjeshtë për të provuar lidhjen MySQL pa nisur gjithë serverin
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const cfg = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    connectionLimit: 1,
    enableKeepAlive: false,
  };

  try {
    if (!cfg.host || cfg.host.includes('REPLACE')) {
      throw new Error('DB_HOST është bosh ose placeholder. Vendos vlerat reale para se ta ekzekutosh.');
    }
    const pool = mysql.createPool(cfg);
    const [rows] = await pool.query('SELECT 1 AS ok');
    console.log('✅ Lidhja OK:', rows);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Lidhja DESHTOI:', err.code || '', err.message);
    process.exit(1);
  }
})();

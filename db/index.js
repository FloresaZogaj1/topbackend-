// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',       // ose username që ke caktuar
  password: '',       // nëse ke password, vendose këtu
  database: 'topmobile_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

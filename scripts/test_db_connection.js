require('dotenv').config({ override: true });
console.log('[TEST_DB] Starting connection test...');
const pool = require('../db');

(async () => {
  try {
    const [[row]] = await pool.query('SELECT 1 AS one, NOW() AS now');
    console.log(`[TEST_DB] Success → one=${row.one} now=${row.now}`);
    process.exit(0);
  } catch (err) {
    console.error('[TEST_DB] Failure:', err.code, err.message);
    if (err.message.includes('DB_NOT_CONFIGURED')) {
      console.error('Set real DB_HOST, DB_USER, DB_PASS in .env first.');
    }
    process.exit(1);
  }
})();
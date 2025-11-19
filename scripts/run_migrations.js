const pool = require('../db');

// Programmatic migration: create contracts_softsave table if missing, and ensure required columns exist.
async function tableExists(table) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [table]
  );
  return rows && rows[0] && rows[0].cnt > 0;
}

async function columnExists(table, column) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
    [table, column]
  );
  return rows && rows[0] && rows[0].cnt > 0;
}

async function ensureColumn(table, column, def) {
  const exists = await columnExists(table, column);
  if (exists) {
    console.log(`Column ${column} exists on ${table}`);
    return;
  }
  console.log(`Adding column ${column} to ${table}`);
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${def}`);
}

async function ensureTableAndColumns() {
  const table = 'contracts_softsave';
  const exists = await tableExists(table);
  if (!exists) {
    console.log(`Table ${table} does not exist — creating`);
    await pool.query(`
      CREATE TABLE \`${table}\` (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NULL,
        device_brand VARCHAR(255) NULL,
        device_model VARCHAR(255) NULL,
        device_name VARCHAR(255) NULL,
        imei VARCHAR(64) NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_type VARCHAR(50) NULL,
        start_date DATE NULL,
        notes TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // add index on customer_id
    try { await pool.query(`ALTER TABLE \`${table}\` ADD INDEX (customer_id)`); } catch (e) { /* ignore */ }
    console.log(`Created table ${table}`);
    return;
  }

  console.log(`Table ${table} exists — ensuring columns`);
  await ensureColumn(table, 'customer_id', '`customer_id` INT NULL');
  await ensureColumn(table, 'device_brand', '`device_brand` VARCHAR(255) NULL');
  await ensureColumn(table, 'device_model', '`device_model` VARCHAR(255) NULL');
  await ensureColumn(table, 'device_name', '`device_name` VARCHAR(255) NULL');
  await ensureColumn(table, 'imei', '`imei` VARCHAR(64) NULL');
  await ensureColumn(table, 'price', '`price` DECIMAL(10,2) NOT NULL DEFAULT 0');
  await ensureColumn(table, 'payment_type', '`payment_type` VARCHAR(50) NULL');
  await ensureColumn(table, 'start_date', '`start_date` DATE NULL');
  await ensureColumn(table, 'notes', '`notes` TEXT NULL');
  await ensureColumn(table, 'created_by', '`created_by` INT NULL');
  // ensure index
  try { await pool.query(`ALTER TABLE \`${table}\` ADD INDEX (customer_id)`); } catch (e) { /* ignore if exists */ }

  // Ensure contract_no is nullable (some schemas have contract_no NOT NULL without default)
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'contract_no'",
      [table]
    );
    if (cols && cols.length) {
      const col = cols[0];
      if (col.IS_NULLABLE === 'NO') {
        console.log('Altering contract_no to allow NULL and default NULL');
        // Use the COLUMN_TYPE to preserve type (e.g. varchar(50), int(11))
        await pool.query(`ALTER TABLE \`${table}\` MODIFY contract_no ${col.COLUMN_TYPE} NULL DEFAULT NULL`);
      }
    }
  } catch (err) {
    console.warn('Could not ensure contract_no nullability', err.message || err);
  }
}

async function main() {
  try {
    await ensureTableAndColumns();
    console.log('Migrations completed');
    return { ok: true };
  } catch (err) {
    console.error('Migration run failed', err);
    throw err;
  }
}

// Allow running as a script or importing as a module
if (require.main === module) {
  main().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runMigrations: main };

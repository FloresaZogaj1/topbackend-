// db/users.js
const db = require('./pool'); // mysql2/promise pool

async function upsertGoogleUser({ email, googleId, name }) {
  // Krijo kolona: users( id PK, email UNIQUE, google_id, name, role )
  const [rows] = await db.query('SELECT * FROM users WHERE email=? OR google_id=? LIMIT 1', [email, googleId]);
  if (rows[0]) return rows[0];
  const [res] = await db.query('INSERT INTO users (email, google_id, name, role) VALUES (?,?,?,?)',
    [email, googleId, name, 'customer']);
  const [created] = await db.query('SELECT * FROM users WHERE id=?', [res.insertId]);
  return created[0];
}
module.exports = { upsertGoogleUser };

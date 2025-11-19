// make_admin.js - Script to promote a user to admin role
require('dotenv').config();
const mysql = require('mysql2/promise');

async function makeAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Update the user role to admin
    const [result] = await connection.execute(
      'UPDATE users SET role = ? WHERE email = ?',
      ['admin', 'admin@topmobile.com']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ User admin@topmobile.com has been promoted to admin role');
    } else {
      console.log('❌ User not found or not updated');
    }

    // Show the updated user
    const [users] = await connection.execute(
      'SELECT id, name, email, role FROM users WHERE email = ?',
      ['admin@topmobile.com']
    );
    
    if (users.length > 0) {
      console.log('Updated user:', users[0]);
    }

  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await connection.end();
  }
}

makeAdmin().catch(console.error);
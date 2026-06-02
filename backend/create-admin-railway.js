require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdminUserRailway() {
  let connection;
  try {
    // Use Railway connection details
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'mysql.railway.internal',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || 'railway'
    });

    const email = 'admin@brewspot.com';
    const password = 'Admin@123';
    const fullName = 'Admin User';
    
    console.log('Connecting to Railway database...');
    console.log('Host:', process.env.MYSQL_HOST);
    console.log('User:', process.env.MYSQL_USER);
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      console.log('✓ Admin user already exists in Railway database');
      await connection.end();
      process.exit(0);
    }
    
    // Insert admin user
    const [result] = await connection.query(
      'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [fullName, email, passwordHash, 'admin', 1]
    );
    
    console.log('✅ Admin user created in Railway database!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${result.insertId}`);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createAdminUserRailway();

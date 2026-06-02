require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

async function createAdminUser() {
  try {
    const email = 'admin@brewspot.com';
    const password = 'Admin@123'; // Change this to a secure password
    const fullName = 'Admin User';
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Insert admin user
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [fullName, email, passwordHash, 'admin', 1]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${result.insertId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();

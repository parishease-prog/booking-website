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
    const existingResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Insert admin user
    const result = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [fullName, email, passwordHash, 'admin', true]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${result.rows[0].id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();

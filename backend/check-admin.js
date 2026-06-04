require('dotenv').config();
const pool = require('./src/config/db');

(async () => {
  try {
    console.log('Checking admin user...');
    const result = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      ['admin@brewspot.com']
    );
    console.log('Admin user:', JSON.stringify(result.rows, null, 2));
    
    console.log('\nAll users:');
    const allUsers = await pool.query('SELECT id, email, role, is_active FROM users');
    console.log(JSON.stringify(allUsers.rows, null, 2));
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

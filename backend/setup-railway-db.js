/**
 * Setup Railway MySQL Database
 * Run this script to initialize the database schema on Railway
 * Usage: MYSQL_HOST=your-host MYSQL_USER=root MYSQL_PASSWORD=your-pwd MYSQL_DB=railway node setup-railway-db.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'resort_booking_db',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  };

  console.log(`Connecting to MySQL at ${config.host}...`);

  try {
    const connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL');

    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    
    // Split by statement and execute
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('/*!'));

    let count = 0;
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        count++;
      } catch (err) {
        // Ignore "table already exists" errors
        if (!err.message.includes('already exists')) {
          console.error(`Error executing statement: ${err.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log(`✓ Executed ${count} schema statements`);
    await connection.end();
    console.log('✓ Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Database setup failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

setupDatabase();

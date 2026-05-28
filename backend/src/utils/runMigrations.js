const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrations() {
  try {
    console.log('[MIGRATIONS] Starting database migrations...');
    
    // Run the main schema
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    const connection = await pool.getConnection();
    
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        // Ignore "table already exists" errors
        if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
          console.error('[MIGRATIONS] Error executing statement:', err.message);
        }
      }
    }
    
    connection.release();
    console.log('[MIGRATIONS] ✓ Database migrations completed successfully');
    return true;
  } catch (err) {
    console.error('[MIGRATIONS] ✗ Failed to run migrations:', err.message);
    // Don't crash the server, just log the error
    return false;
  }
}

module.exports = { runMigrations };

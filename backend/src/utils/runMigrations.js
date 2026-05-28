const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrations() {
  try {
    console.log('[MIGRATIONS] Starting database migrations...');
    
    // Wait a moment for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run the main schema
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('[MIGRATIONS] Schema file not found at:', schemaPath);
      return false;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    const connection = await pool.getConnection();
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      try {
        await connection.query(statement);
        successCount++;
      } catch (err) {
        // Ignore "table already exists" errors
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_ENTRY') {
          skipCount++;
        } else {
          console.error('[MIGRATIONS] Error executing statement:', err.message);
        }
      }
    }
    
    connection.release();
    console.log(`[MIGRATIONS] ✓ Completed: ${successCount} created, ${skipCount} skipped`);
    return true;
  } catch (err) {
    console.error('[MIGRATIONS] ✗ Failed to run migrations:', err.message);
    // Don't crash the server, just log the error
    return false;
  }
}

module.exports = { runMigrations };

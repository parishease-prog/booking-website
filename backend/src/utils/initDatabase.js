/**
 * Database initialization utility
 * Creates tables on first run if they don't exist
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const db = require('../config/db');

async function initializeDatabase() {
  try {
    console.log('[DB INIT] Checking if database needs initialization...');
    
    // Try a simple query to see if tables exist
    const connection = await db.getConnection();
    
    try {
      await connection.query('SELECT COUNT(*) FROM rooms');
      console.log('[DB INIT] ✓ Database tables already exist');
      connection.release();
      return true;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log('[DB INIT] ⚠ Tables not found, initializing schema...');
        connection.release();
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        const pool = mysql.createPool({
          host: process.env.MYSQL_HOST || 'mysql.railway.internal',
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQL_DB || 'railway',
          waitForConnections: true,
          connectionLimit: 1,
          queueLimit: 0,
        });

        const conn = await pool.getConnection();
        
        // Split and execute statements
        const statements = schemaSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('/*!'));

        let count = 0;
        for (const statement of statements) {
          try {
            await conn.execute(statement);
            count++;
          } catch (err) {
            if (!err.message.includes('already exists')) {
              console.log('[DB INIT] Warning:', err.message.substring(0, 100));
            }
          }
        }

        console.log(`[DB INIT] ✓ Initialized ${count} schema statements`);
        conn.release();
        await pool.end();
        return true;
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('[DB INIT] ✗ Error:', err.message);
    console.error('[DB INIT] Full error:', JSON.stringify(err, null, 2));
    console.error('[DB INIT] Error code:', err.code);
    console.error('[DB INIT] Error errno:', err.errno);
    return false;
  }
}

module.exports = { initializeDatabase };

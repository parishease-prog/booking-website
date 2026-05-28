const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('[DB CONFIG] Initializing connection pool');
console.log('[DB CONFIG] HOST:', process.env.MYSQL_HOST || process.env.DB_HOST || 'mysql.railway.internal');
console.log('[DB CONFIG] DATABASE:', process.env.MYSQL_DB || process.env.DB_NAME || 'railway');

let pool;

try {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'mysql.railway.internal',
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DB || process.env.DB_NAME || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0
  });
  console.log('[DB CONFIG] ✓ Pool created successfully');
} catch (err) {
  console.error('[DB CONFIG] ✗ Failed to create pool:', err.message);
  pool = null;
}

module.exports = pool;
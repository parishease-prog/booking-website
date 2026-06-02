const { Pool } = require('pg');
require('dotenv').config();

console.log('[DB CONFIG] Initializing PostgreSQL connection pool');

// Use DATABASE_URL from Vercel/Neon, or construct from env variables
const connectionString = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  `postgresql://${process.env.POSTGRES_USER || process.env.DB_USER || 'user'}:${process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || ''}@${process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'neondb'}`;

let pool;

try {
  pool = new Pool({
    connectionString: connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('[DB CONFIG] Unexpected pool error:', err);
  });

  console.log('[DB CONFIG] ✓ PostgreSQL pool created successfully');
  console.log('[DB CONFIG] DATABASE:', process.env.POSTGRES_DATABASE || 'neondb');
} catch (err) {
  console.error('[DB CONFIG] ✗ Failed to create pool:', err.message);
  pool = null;
}

module.exports = pool;
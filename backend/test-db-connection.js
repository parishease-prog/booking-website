const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  `postgresql://${process.env.POSTGRES_USER || process.env.DB_USER || 'user'}:${process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || ''}@${process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'neondb'}`;

const pool = new Pool({
  connectionString: connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testQueries() {
  try {
    console.log('🔄 Testing database connection...');
    console.log('Connection String (redacted): postgresql://***@****/neondb');

    // Test 1: Basic connection
    const test1 = await pool.query('SELECT NOW()');
    console.log('✅ Basic connection works');

    // Test 2: Check amenities_cards table exists
    const test2 = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'amenities_cards'
      )
    `);
    console.log('✅ amenities_cards table exists:', test2.rows[0].exists);

    // Test 3: Count amenities
    const test3 = await pool.query('SELECT COUNT(*) FROM amenities_cards');
    console.log('✅ Amenities count:', test3.rows[0].count);

    // Test 4: Select amenities (exact query from controller)
    const test4 = await pool.query(`
      SELECT
        id,
        title,
        description,
        sort_order
      FROM amenities_cards
      WHERE is_active = true
      ORDER BY sort_order ASC, id ASC
    `);
    console.log('✅ Amenities query result:', JSON.stringify(test4.rows, null, 2));

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testQueries();

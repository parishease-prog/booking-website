const { Pool } = require('pg');
const fs = require('fs');

async function checkAndSetup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL
  });

  try {
    // Check existing columns
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='room_types' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current room_types columns:', result.rows.map(r => r.column_name).join(', '));
    
    if (!result.rows.some(r => r.column_name === 'base_capacity')) {
      console.log('\n⚠️  Missing base_capacity! Re-running schema setup...\n');
      
      // Read the schema file
      const schema = fs.readFileSync('./neon-schema.sql', 'utf-8');
      
      // Execute the entire schema
      await pool.query(schema);
      console.log('✅ Schema re-applied');
      
      // Check again
      const result2 = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='room_types' 
        ORDER BY ordinal_position
      `);
      console.log('Updated room_types columns:', result2.rows.map(r => r.column_name).join(', '));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAndSetup();

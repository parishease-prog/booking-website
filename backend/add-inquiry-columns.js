const pool = require('./src/config/db');

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to inquiries table...');
    
    // Add review_notes column
    await pool.query(`
      ALTER TABLE inquiries
      ADD COLUMN IF NOT EXISTS review_notes TEXT
    `);
    console.log('✓ Added review_notes column');
    
    // Add reviewed_at column
    await pool.query(`
      ALTER TABLE inquiries
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✓ Added reviewed_at column');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='inquiries'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated inquiries table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });
    
    pool.end();
  } catch (error) {
    console.error('Error adding columns:', error.message);
    pool.end();
    process.exit(1);
  }
}

addMissingColumns();

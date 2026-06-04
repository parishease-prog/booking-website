require('dotenv').config();
const pool = require('./src/config/db');

async function fixTimestampColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Starting timestamp column migration...\n');
    
    // Check current column types
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('reservation_holds', 'reservations', 'reservation_rooms', 'availability_blocks')
      AND column_name LIKE '%at' OR column_name LIKE 'expires%'
      ORDER BY table_name, column_name
    `);
    
    console.log('Current timestamp columns:');
    checkResult.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });
    
    // Convert TIMESTAMP to TIMESTAMPTZ for critical columns
    const migrations = [
      {
        table: 'reservation_holds',
        column: 'expires_at',
        description: 'Reservation hold expiration time'
      },
      {
        table: 'reservation_holds',
        column: 'created_at',
        description: 'Hold creation time'
      },
      {
        table: 'reservation_holds',
        column: 'updated_at',
        description: 'Hold update time'
      }
    ];
    
    console.log('\nApplying migrations...\n');
    
    for (const migration of migrations) {
      try {
        console.log(`Converting ${migration.table}.${migration.column} to TIMESTAMPTZ...`);
        await client.query(`
          ALTER TABLE ${migration.table}
          ALTER COLUMN ${migration.column} TYPE TIMESTAMPTZ USING ${migration.column} AT TIME ZONE 'UTC'
        `);
        console.log(`✓ ${migration.table}.${migration.column} converted successfully\n`);
      } catch (error) {
        console.log(`✗ Error converting ${migration.table}.${migration.column}: ${error.message}\n`);
      }
    }
    
    // Verify changes
    console.log('Verifying changes...\n');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('reservation_holds', 'reservations', 'reservation_rooms', 'availability_blocks')
      AND (column_name LIKE '%at' OR column_name LIKE 'expires%')
      ORDER BY table_name, column_name
    `);
    
    console.log('Updated timestamp columns:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✓ Migration completed');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTimestampColumns();

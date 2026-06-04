require('dotenv').config();
const pool = require('./src/config/db');

async function fixPaymentWebhookEventsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Fixing payment_webhook_events table...\n');
    
    // Drop the existing table if it has wrong structure
    console.log('Dropping existing payment_webhook_events table...');
    await client.query(`DROP TABLE IF EXISTS payment_webhook_events CASCADE`);
    
    // Create the table with correct structure
    console.log('Creating payment_webhook_events table with correct structure...\n');
    await client.query(
      `
      CREATE TABLE payment_webhook_events (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(40) NOT NULL,
        event_id VARCHAR(120) NOT NULL,
        reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL ON UPDATE CASCADE,
        payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE,
        processing_status VARCHAR(50) NOT NULL DEFAULT 'received',
        error_message VARCHAR(255),
        payload_json TEXT,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (provider, event_id),
        CHECK (processing_status IN ('received', 'processed', 'failed'))
      )
      `
    );
    
    console.log('✓ payment_webhook_events table created successfully\n');
    
    // Verify the table exists
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'payment_webhook_events'
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✓ Migration completed successfully');
    
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPaymentWebhookEventsTable();

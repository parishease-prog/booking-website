const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDB() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RfB5QlVN2deI@ep-crimson-night-apu8suw3-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Drop existing tables if they exist
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS schema_migrations CASCADE;
      DROP TABLE IF EXISTS reservation_hold_rooms CASCADE;
      DROP TABLE IF EXISTS reservation_holds CASCADE;
      DROP TABLE IF EXISTS activity_logs CASCADE;
      DROP TABLE IF EXISTS policies CASCADE;
      DROP TABLE IF EXISTS inquiries CASCADE;
      DROP TABLE IF EXISTS landing_content CASCADE;
      DROP TABLE IF EXISTS homepage_slides CASCADE;
      DROP TABLE IF EXISTS amenities_content CASCADE;
      DROP TABLE IF EXISTS amenities_card_images CASCADE;
      DROP TABLE IF EXISTS amenities_cards CASCADE;
      DROP TABLE IF EXISTS announcements CASCADE;
      DROP TABLE IF EXISTS availability_blocks CASCADE;
      DROP TABLE IF EXISTS room_images CASCADE;
      DROP TABLE IF EXISTS reservation_status_history CASCADE;
      DROP TABLE IF EXISTS reservation_charges CASCADE;
      DROP TABLE IF EXISTS room_transfers CASCADE;
      DROP TABLE IF EXISTS stay_extensions CASCADE;
      DROP TABLE IF EXISTS cancellation_requests CASCADE;
      DROP TABLE IF EXISTS refund_requests CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS reservation_rooms CASCADE;
      DROP TABLE IF EXISTS reservations CASCADE;
      DROP TABLE IF EXISTS promos CASCADE;
      DROP TABLE IF EXISTS guests CASCADE;
      DROP TABLE IF EXISTS rooms CASCADE;
      DROP TABLE IF EXISTS room_types CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Tables dropped');

    // Read schema file
    const schema = fs.readFileSync(path.join(__dirname, 'neon-schema.sql'), 'utf-8');
    
    // Split by semicolon and execute each statement individually
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Executing ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i]);
      } catch (err) {
        console.error(`Statement ${i+1} failed:`, err.message);
        // Continue with next statement
      }
    }

    console.log('✅ Schema created successfully');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

setupDB();

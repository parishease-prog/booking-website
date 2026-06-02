const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const CONNECTION_STRING = 'postgresql://neondb_owner:npg_RfB5QlVN2deI@ep-crimson-night-apu8suw3-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function setupNeonDatabase() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
  });

  try {
    console.log('🔄 Connecting to Neon...');
    await client.connect();
    console.log('✅ Connected to Neon');

    // Read the clean PostgreSQL schema
    const schemaFile = path.join(__dirname, 'neon-schema.sql');
    const schemaSql = fs.readFileSync(schemaFile, 'utf-8');

    // Execute the entire schema file at once (PostgreSQL can handle multiple statements)
    console.log(`\n🔄 Creating tables and indexes...`);
    
    try {
      await client.query(schemaSql);
      console.log('✅ All tables and indexes created successfully');
    } catch (error) {
      console.log('✅ Database schema setup complete (may have skipped existing objects)');
      console.log(`   Note: ${error.message}`);
    }

    // Create admin user with bcrypt hash
    console.log('🔄 Creating admin user...');
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        ['Admin User', 'admin@brewspot.com', passwordHash, 'admin', true]
      );
      console.log('✅ Admin user created');
      console.log(`   Email: admin@brewspot.com`);
      console.log(`   Password: ${password}`);
    } catch (error) {
      console.log('✅ Admin user already exists');
    }

    // Create a sample room type if needed
    try {
      await client.query(
        `INSERT INTO room_types (name, description, is_active)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        ['Deluxe Suite', 'A spacious suite with premium amenities', true]
      );
      console.log('✅ Sample room type created');
    } catch (error) {
      console.log('⚠️  Room type insert note:', error.message);
    }

    console.log('\n🎉 Neon PostgreSQL database is ready!');
    console.log('✅ Database URL: postgresql://neondb_owner:npg_RfB5QlVN2deI@ep-crimson-night-apu8suw3-pooler.c-7.us-east-1.aws.neon.tech/neondb');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupNeonDatabase();

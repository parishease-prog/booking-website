const { Client } = require('pg');
require('dotenv').config();

const CONNECTION_STRING = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_RfB5QlVN2deI@ep-crimson-night-apu8suw3-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function seedAmenities() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
  });

  try {
    console.log('🔄 Connecting to Neon...');
    await client.connect();
    console.log('✅ Connected to Neon');

    // Seed amenities cards
    console.log('🔄 Creating sample amenities cards...');
    
    const amenities = [
      {
        title: 'Free WiFi',
        description: 'High-speed internet connection available throughout the property',
        sort_order: 1,
        is_active: true
      },
      {
        title: 'Swimming Pool',
        description: 'Refreshing outdoor swimming pool with sun loungers',
        sort_order: 2,
        is_active: true
      },
      {
        title: 'Restaurant & Bar',
        description: 'On-site dining with local and international cuisine',
        sort_order: 3,
        is_active: true
      }
    ];

    for (const amenity of amenities) {
      try {
        const result = await client.query(
          `INSERT INTO amenities_cards (title, description, sort_order, is_active)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [amenity.title, amenity.description, amenity.sort_order, amenity.is_active]
        );
        console.log(`✅ Created amenity: "${amenity.title}" (ID: ${result.rows[0].id})`);
      } catch (err) {
        console.log(`⚠️  Amenity "${amenity.title}" already exists or error: ${err.message}`);
      }
    }

    console.log('\n✅ Amenities seed completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedAmenities();

require('dotenv').config();
const pool = require('./src/config/db');

async function seedRooms() {
  try {
    console.log('🔄 Seeding room types and rooms...');

    // Create room types
    const roomTypes = [
      {
        name: 'Standard Room',
        description: 'Basic room with essential amenities',
        base_capacity: 2,
        max_capacity: 2,
        base_price: 2500
      },
      {
        name: 'Deluxe Room',
        description: 'Spacious room with premium amenities',
        base_capacity: 2,
        max_capacity: 3,
        base_price: 3500
      },
      {
        name: 'Suite',
        description: 'Luxurious suite with living area',
        base_capacity: 2,
        max_capacity: 4,
        base_price: 5000
      }
    ];

    const createdRoomTypes = [];
    for (const rt of roomTypes) {
      try {
        const result = await pool.query(
          `INSERT INTO room_types (name, description, base_capacity, max_capacity, base_price)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [rt.name, rt.description, rt.base_capacity, rt.max_capacity, rt.base_price]
        );
        if (result.rows.length > 0) {
          createdRoomTypes.push(result.rows[0].id);
          console.log(`✅ Created room type: ${rt.name}`);
        } else {
          console.log(`⏭️ Room type already exists: ${rt.name}`);
        }
      } catch (err) {
        console.error(`Error creating room type ${rt.name}:`, err.message);
      }
    }

    // Get all room types for creating rooms
    const allRoomTypes = await pool.query('SELECT id, name FROM room_types ORDER BY id');
    const roomTypeMap = allRoomTypes.rows;

    // Create rooms
    const rooms = [
      { room_number: '101', room_name: 'Sunrise Room', typeIndex: 0 },
      { room_number: '102', room_name: 'Sunset Room', typeIndex: 0 },
      { room_number: '201', room_name: 'Garden Suite', typeIndex: 1 },
      { room_number: '202', room_name: 'Beach Suite', typeIndex: 1 },
      { room_number: '301', room_name: 'Presidential Suite', typeIndex: 2 },
      { room_number: '302', room_name: 'Royal Suite', typeIndex: 2 }
    ];

    for (const room of rooms) {
      try {
        if (roomTypeMap[room.typeIndex]) {
          const result = await pool.query(
            `INSERT INTO rooms (room_type_id, room_number, room_name, status, is_active)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (room_number) DO NOTHING
             RETURNING id`,
            [roomTypeMap[room.typeIndex].id, room.room_number, room.room_name, 'available', true]
          );
          if (result.rows.length > 0) {
            console.log(`✅ Created room: ${room.room_number} - ${room.room_name}`);
          } else {
            console.log(`⏭️ Room already exists: ${room.room_number}`);
          }
        }
      } catch (err) {
        console.error(`Error creating room ${room.room_number}:`, err.message);
      }
    }

    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedRooms();

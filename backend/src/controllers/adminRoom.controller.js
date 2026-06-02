const pool = require('../config/db');
const { validateUrl, validateText } = require('../utils/validation');

async function getAdminRoomTypes(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM room_types ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load room types' });
  }
}

async function createRoomType(req, res) {
  try {
    const {
      name,
      description,
      base_capacity,
      max_capacity,
      base_price,
      extra_guest_fee
    } = req.body;

    if (!name || base_capacity === undefined || max_capacity === undefined || base_price === undefined) {
      return res.status(400).json({ message: 'name, base_capacity, max_capacity, and base_price are required' });
    }

    const numBase = Number(base_capacity);
    const numMax = Number(max_capacity);
    const numPrice = Number(base_price);
    const numFee = extra_guest_fee === undefined || extra_guest_fee === null ? 0 : Number(extra_guest_fee);

    // Validate numeric boundaries
    if (!Number.isInteger(numBase) || numBase < 1 || numBase > 100) {
      return res.status(400).json({ message: 'base_capacity must be an integer between 1 and 100' });
    }

    if (!Number.isInteger(numMax) || numMax < 1 || numMax > 100) {
      return res.status(400).json({ message: 'max_capacity must be an integer between 1 and 100' });
    }

    if (numMax < numBase) {
      return res.status(400).json({ message: 'max_capacity cannot be less than base_capacity' });
    }

    if (!Number.isFinite(numPrice) || numPrice < 0 || numPrice > 1000000) {
      return res.status(400).json({ message: 'base_price must be a non-negative number up to 1,000,000' });
    }

    if (!Number.isFinite(numFee) || numFee < 0 || numFee > 100000) {
      return res.status(400).json({ message: 'extra_guest_fee must be a non-negative number up to 100,000' });
    }

    const result = await pool.query(
      `
      INSERT INTO room_types (name, description, base_capacity, max_capacity, base_price, extra_guest_fee)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        name,
        description || null,
        numBase,
        numMax,
        numPrice,
        numFee
      ]
    );

    const fetchResult = await pool.query('SELECT * FROM room_types WHERE id = $1 LIMIT 1', [result.rows[0].id]);
    res.status(201).json(fetchResult.rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Room type name already exists' });
    }
    res.status(500).json({ message: 'Failed to create room type' });
  }
}

async function updateRoomType(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      base_capacity,
      max_capacity,
      base_price,
      extra_guest_fee
    } = req.body;

    if (!name || base_capacity === undefined || max_capacity === undefined || base_price === undefined) {
      return res.status(400).json({ message: 'name, base_capacity, max_capacity, and base_price are required' });
    }

    const numBase = Number(base_capacity);
    const numMax = Number(max_capacity);
    const numPrice = Number(base_price);
    const numFee = extra_guest_fee === undefined || extra_guest_fee === null ? 0 : Number(extra_guest_fee);

    // Validate numeric boundaries
    if (!Number.isInteger(numBase) || numBase < 1 || numBase > 100) {
      return res.status(400).json({ message: 'base_capacity must be an integer between 1 and 100' });
    }

    if (!Number.isInteger(numMax) || numMax < 1 || numMax > 100) {
      return res.status(400).json({ message: 'max_capacity must be an integer between 1 and 100' });
    }

    if (numMax < numBase) {
      return res.status(400).json({ message: 'max_capacity cannot be less than base_capacity' });
    }

    if (!Number.isFinite(numPrice) || numPrice < 0 || numPrice > 1000000) {
      return res.status(400).json({ message: 'base_price must be a non-negative number up to 1,000,000' });
    }

    if (!Number.isFinite(numFee) || numFee < 0 || numFee > 100000) {
      return res.status(400).json({ message: 'extra_guest_fee must be a non-negative number up to 100,000' });
    }

    const result = await pool.query(
      `
      UPDATE room_types
      SET
        name = $1,
        description = $2,
        base_capacity = $3,
        max_capacity = $4,
        base_price = $5,
        extra_guest_fee = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      `,
      [
        name,
        description || null,
        numBase,
        numMax,
        numPrice,
        numFee,
        id
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    const fetchResult = await pool.query('SELECT * FROM room_types WHERE id = $1 LIMIT 1', [id]);
    res.json(fetchResult.rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Room type name already exists' });
    }
    res.status(500).json({ message: 'Failed to update room type' });
  }
}

async function deleteRoomType(req, res) {
  try {
    const { id } = req.params;

    // Check if any rooms use this room type
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM rooms WHERE room_type_id = $1',
      [id]
    );
    const count = parseInt(countResult.rows[0].count, 10);

    if (count > 0) {
      return res.status(409).json({
        message: `Cannot delete room type. ${count} room(s) are using this type.`
      });
    }

    // Delete the room type
    const result = await pool.query(
      'DELETE FROM room_types WHERE id = $1',
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    res.json({ message: 'Room type deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete room type' });
  }
}

async function getAdminRooms(req, res) {
  try {
    const { room_type_id } = req.query;
    const params = [];
    const where = [];

    if (room_type_id) {
      where.push('r.room_type_id = $1');
      params.push(Number(room_type_id));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        r.*,
        rt.name AS room_type_name,
        rt.base_capacity,
        rt.max_capacity,
        COALESCE(r.price_override, rt.base_price) AS effective_price
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      ${whereClause}
      ORDER BY r.room_number ASC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load rooms' });
  }
}

async function createRoom(req, res) {
  try {
    const {
      room_type_id,
      room_number,
      room_name,
      description,
      floor_label,
      max_guests_override,
      price_override,
      status = 'available',
      is_featured = 0,
      is_active = 1
    } = req.body;

    if (!room_type_id || !room_number || !room_name) {
      return res.status(400).json({ message: 'room_type_id, room_number, and room_name are required' });
    }

    const result = await pool.query(
      `
      INSERT INTO rooms (
        room_type_id,
        room_number,
        room_name,
        description,
        floor_label,
        max_guests_override,
        price_override,
        status,
        is_featured,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        Number(room_type_id),
        String(room_number),
        String(room_name),
        description || null,
        floor_label || null,
        max_guests_override === undefined || max_guests_override === null || max_guests_override === '' ? null : Number(max_guests_override),
        price_override === undefined || price_override === null || price_override === '' ? null : Number(price_override),
        status,
        is_featured ? 1 : 0,
        is_active ? 1 : 0
      ]
    );

    const fetchResult = await pool.query(
      `
      SELECT
        r.*,
        rt.name AS room_type_name,
        rt.base_capacity,
        rt.max_capacity,
        COALESCE(r.price_override, rt.base_price) AS effective_price
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE r.id = $1
      LIMIT 1
      `,
      [result.rows[0].id]
    );

    res.status(201).json(fetchResult.rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Room number already exists' });
    }
    res.status(500).json({ message: 'Failed to create room' });
  }
}

async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const {
      room_type_id,
      room_number,
      room_name,
      description,
      floor_label,
      max_guests_override,
      price_override,
      status,
      is_featured,
      is_active
    } = req.body;

    if (!room_type_id || !room_number || !room_name) {
      return res.status(400).json({ message: 'room_type_id, room_number, and room_name are required' });
    }

    const result = await pool.query(
      `
      UPDATE rooms
      SET
        room_type_id = $1,
        room_number = $2,
        room_name = $3,
        description = $4,
        floor_label = $5,
        max_guests_override = $6,
        price_override = $7,
        status = $8,
        is_featured = $9,
        is_active = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      `,
      [
        Number(room_type_id),
        String(room_number),
        String(room_name),
        description || null,
        floor_label || null,
        max_guests_override === undefined || max_guests_override === null || max_guests_override === '' ? null : Number(max_guests_override),
        price_override === undefined || price_override === null || price_override === '' ? null : Number(price_override),
        status || 'available',
        is_featured ? 1 : 0,
        is_active ? 1 : 0,
        id
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const fetchResult = await pool.query(
      `
      SELECT
        r.*,
        rt.name AS room_type_name,
        rt.base_capacity,
        rt.max_capacity,
        COALESCE(r.price_override, rt.base_price) AS effective_price
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE r.id = $1
      LIMIT 1
      `,
      [id]
    );

    res.json(fetchResult.rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Room number already exists' });
    }
    res.status(500).json({ message: 'Failed to update room' });
  }
}

async function getRoomImages(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT *
      FROM room_images
      WHERE room_id = $1
      ORDER BY is_primary DESC, sort_order ASC, id ASC
      `,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load room images' });
  }
}

async function addRoomImage(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      image_url,
      alt_text,
      sort_order = 1,
      is_primary = 0
    } = req.body;

    if (!image_url) {
      return res.status(400).json({ message: 'image_url is required' });
    }

    // Validate URL format
    if (!validateUrl(image_url)) {
      return res.status(400).json({ message: 'Invalid image URL format' });
    }

    await client.query('BEGIN');

    if (is_primary) {
      await client.query(
        'UPDATE room_images SET is_primary = 0 WHERE room_id = $1',
        [id]
      );
    }

    const result = await client.query(
      `
      INSERT INTO room_images (room_id, image_url, alt_text, sort_order, is_primary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        Number(id),
        String(image_url),
        alt_text || null,
        Number(sort_order || 1),
        is_primary ? 1 : 0
      ]
    );

    await client.query('COMMIT');

    const fetchResult = await pool.query(
      'SELECT * FROM room_images WHERE id = $1 LIMIT 1',
      [result.rows[0].id]
    );

    res.status(201).json(fetchResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to add room image' });
  } finally {
    client.release();
  }
}

async function deleteRoomImage(req, res) {
  try {
    const { imageId } = req.params;
    const result = await pool.query(
      'DELETE FROM room_images WHERE id = $1',
      [imageId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Room image not found' });
    }

    res.json({ message: 'Room image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete room image' });
  }
}

async function setPrimaryRoomImage(req, res) {
  const client = await pool.connect();

  try {
    const { id, imageId } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'SELECT id FROM room_images WHERE id = $1 AND room_id = $2 LIMIT 1',
      [imageId, id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Room image not found' });
    }

    await client.query(
      'UPDATE room_images SET is_primary = 0 WHERE room_id = $1',
      [id]
    );

    await client.query(
      'UPDATE room_images SET is_primary = 1 WHERE id = $1',
      [imageId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Primary image updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to set primary image' });
  } finally {
    client.release();
  }
}

module.exports = {
  getAdminRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  getAdminRooms,
  createRoom,
  updateRoom,
  getRoomImages,
  addRoomImage,
  deleteRoomImage,
  setPrimaryRoomImage
};


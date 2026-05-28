const pool = require('../config/db');
const { validateUrl, validateText } = require('../utils/validation');

async function getAdminRoomTypes(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM room_types ORDER BY name ASC'
    );
    res.json(rows);
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

    const [result] = await pool.query(
      `
      INSERT INTO room_types (name, description, base_capacity, max_capacity, base_price, extra_guest_fee)
      VALUES (?, ?, ?, ?, ?, ?)
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

    const [rows] = await pool.query('SELECT * FROM room_types WHERE id = ? LIMIT 1', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === 'ER_DUP_ENTRY') {
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

    const [result] = await pool.query(
      `
      UPDATE room_types
      SET
        name = ?,
        description = ?,
        base_capacity = ?,
        max_capacity = ?,
        base_price = ?,
        extra_guest_fee = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
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

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    const [rows] = await pool.query('SELECT * FROM room_types WHERE id = ? LIMIT 1', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Room type name already exists' });
    }
    res.status(500).json({ message: 'Failed to update room type' });
  }
}

async function deleteRoomType(req, res) {
  try {
    const { id } = req.params;

    // Check if any rooms use this room type
    const [rooms] = await pool.query(
      'SELECT COUNT(*) as count FROM rooms WHERE room_type_id = ?',
      [id]
    );

    if (rooms[0].count > 0) {
      return res.status(409).json({
        message: `Cannot delete room type. ${rooms[0].count} room(s) are using this type.`
      });
    }

    // Delete the room type
    const [result] = await pool.query(
      'DELETE FROM room_types WHERE id = ?',
      [id]
    );

    if (!result.affectedRows) {
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
      where.push('r.room_type_id = ?');
      params.push(Number(room_type_id));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
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

    res.json(rows);
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

    const [result] = await pool.query(
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    const [rows] = await pool.query(
      `
      SELECT
        r.*,
        rt.name AS room_type_name,
        rt.base_capacity,
        rt.max_capacity,
        COALESCE(r.price_override, rt.base_price) AS effective_price
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === 'ER_DUP_ENTRY') {
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

    const [result] = await pool.query(
      `
      UPDATE rooms
      SET
        room_type_id = ?,
        room_number = ?,
        room_name = ?,
        description = ?,
        floor_label = ?,
        max_guests_override = ?,
        price_override = ?,
        status = ?,
        is_featured = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
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

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const [rows] = await pool.query(
      `
      SELECT
        r.*,
        rt.name AS room_type_name,
        rt.base_capacity,
        rt.max_capacity,
        COALESCE(r.price_override, rt.base_price) AS effective_price
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Room number already exists' });
    }
    res.status(500).json({ message: 'Failed to update room' });
  }
}

async function getRoomImages(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT *
      FROM room_images
      WHERE room_id = ?
      ORDER BY is_primary DESC, sort_order ASC, id ASC
      `,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load room images' });
  }
}

async function addRoomImage(req, res) {
  const connection = await pool.getConnection();

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

    await connection.beginTransaction();

    if (is_primary) {
      await connection.query(
        'UPDATE room_images SET is_primary = 0 WHERE room_id = ?',
        [id]
      );
    }

    const [result] = await connection.query(
      `
      INSERT INTO room_images (room_id, image_url, alt_text, sort_order, is_primary)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(id),
        String(image_url),
        alt_text || null,
        Number(sort_order || 1),
        is_primary ? 1 : 0
      ]
    );

    await connection.commit();

    const [rows] = await pool.query(
      'SELECT * FROM room_images WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to add room image' });
  } finally {
    connection.release();
  }
}

async function deleteRoomImage(req, res) {
  try {
    const { imageId } = req.params;
    const [result] = await pool.query(
      'DELETE FROM room_images WHERE id = ?',
      [imageId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Room image not found' });
    }

    res.json({ message: 'Room image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete room image' });
  }
}

async function setPrimaryRoomImage(req, res) {
  const connection = await pool.getConnection();

  try {
    const { id, imageId } = req.params;

    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT id FROM room_images WHERE id = ? AND room_id = ? LIMIT 1',
      [imageId, id]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Room image not found' });
    }

    await connection.query(
      'UPDATE room_images SET is_primary = 0 WHERE room_id = ?',
      [id]
    );

    await connection.query(
      'UPDATE room_images SET is_primary = 1 WHERE id = ?',
      [imageId]
    );

    await connection.commit();

    res.json({ message: 'Primary image updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to set primary image' });
  } finally {
    connection.release();
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


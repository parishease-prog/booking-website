const pool = require('../config/db');
const {
  validateDateRange,
  getAvailableRoomsQuery,
  expireStaleHolds
} = require('../utils/booking');

async function getRoomTypes(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM room_types ORDER BY base_price ASC, name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch room types' });
  }
}

async function getRooms(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        r.*,
        rt.name AS room_type_name,
        COALESCE(r.price_override, rt.base_price) AS effective_price,
        (
          SELECT ri.image_url
          FROM room_images ri
          WHERE ri.room_id = r.id
          ORDER BY ri.is_primary DESC, ri.sort_order ASC, ri.id ASC
          LIMIT 1
        ) AS primary_image_url,
        (
          SELECT ri.alt_text
          FROM room_images ri
          WHERE ri.room_id = r.id
          ORDER BY ri.is_primary DESC, ri.sort_order ASC, ri.id ASC
          LIMIT 1
        ) AS primary_image_alt
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE r.is_active = true
      ORDER BY r.room_number ASC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database query failed' });
  }
}

async function getPromos(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM promos
      WHERE is_active = true
      ORDER BY start_date ASC, end_date ASC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch promos' });
  }
}

async function getAvailableRooms(req, res) {
  try {
    const { check_in_date, check_out_date, room_type_id, hold_token } = req.query;
    const dateError = validateDateRange(check_in_date, check_out_date);

    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    await expireStaleHolds(pool);

    const availableRoomsResult = await getAvailableRoomsQuery(pool, {
      checkInDate: check_in_date,
      checkOutDate: check_out_date,
      roomTypeId: room_type_id || null,
      ignoreHoldToken: hold_token || null
    });

    res.json(availableRoomsResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch available rooms' });
  }
}

module.exports = {
  getRoomTypes,
  getRooms,
  getPromos,
  getAvailableRooms
};

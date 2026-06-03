const pool = require('../config/db');

async function getAvailabilityBlocks(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT ab.*, r.room_number, r.room_name
      FROM availability_blocks ab
      LEFT JOIN rooms r ON r.id = ab.room_id
      ORDER BY ab.start_date ASC, ab.end_date ASC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch availability blocks' });
  }
}

async function createAvailabilityBlock(req, res) {
  try {
    const {
      room_id,
      block_scope = 'room',
      start_date,
      end_date,
      reason,
      created_by
    } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'start_date and end_date are required' });
    }

    if (end_date < start_date) {
      return res.status(400).json({ message: 'end_date must be on or after start_date' });
    }

    if (block_scope === 'room' && !room_id) {
      return res.status(400).json({ message: 'room_id is required for room blocks' });
    }

    const result = await pool.query(
      `
      INSERT INTO availability_blocks (
        room_id,
        block_scope,
        start_date,
        end_date,
        reason,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'active', $6)
      RETURNING id
      `,
      [
        block_scope === 'whole_resort' ? null : room_id,
        block_scope,
        start_date,
        end_date,
        reason || null,
        created_by || null
      ]
    );

    res.status(201).json({
      message: 'Availability block created successfully',
      block_id: result.rows[0].id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create availability block' });
  }
}

module.exports = {
  getAvailabilityBlocks,
  createAvailabilityBlock
};

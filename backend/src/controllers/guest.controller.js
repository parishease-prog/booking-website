const pool = require('../config/db');
const { validateEmail, validateText } = require('../utils/validation');

async function getGuests(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM guests
      ORDER BY created_at DESC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch guests' });
  }
}

async function getGuestById(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM guests WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch guest' });
  }
}

async function updateGuest(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      address_line,
      city,
      province,
      country,
      notes
    } = req.body;

    // Validate optional email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate optional text fields
    if (first_name && !validateText(first_name, 100)) {
      return res.status(400).json({ message: 'First name must be 1-100 characters' });
    }

    if (last_name && !validateText(last_name, 100)) {
      return res.status(400).json({ message: 'Last name must be 1-100 characters' });
    }

    if (notes && !validateText(notes, 500)) {
      return res.status(400).json({ message: 'Notes must be 1-500 characters' });
    }

    // Validate address fields if provided
    if (address_line && !validateText(address_line, 200)) {
      return res.status(400).json({ message: 'Address line must be 1-200 characters' });
    }

    if (city && !validateText(city, 100)) {
      return res.status(400).json({ message: 'City must be 1-100 characters' });
    }

    if (province && !validateText(province, 100)) {
      return res.status(400).json({ message: 'Province must be 1-100 characters' });
    }

    if (country && !validateText(country, 100)) {
      return res.status(400).json({ message: 'Country must be 1-100 characters' });
    }

    await pool.query(
      `
      UPDATE guests
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        address_line = COALESCE($5, address_line),
        city = COALESCE($6, city),
        province = COALESCE($7, province),
        country = COALESCE($8, country),
        notes = COALESCE($9, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      `,
      [
        first_name ?? null,
        last_name ?? null,
        email ?? null,
        phone ?? null,
        address_line ?? null,
        city ?? null,
        province ?? null,
        country ?? null,
        notes ?? null,
        req.params.id
      ]
    );

    res.json({ message: 'Guest updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update guest' });
  }
}

module.exports = {
  getGuests,
  getGuestById,
  updateGuest
};

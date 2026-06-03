const pool = require('../config/db');
const { validateUrl, validateText } = require('../utils/validation');

const defaultAmenitiesContent = {
  eyebrow: 'Amenities',
  title: 'What do we have to offer? A lot. Kinda...',
  image_url: '',
  image_alt: 'Amenities section image',
  subtitle: ''
};

async function getPublicAmenitiesContent(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        eyebrow,
        title,
        image_url,
        image_alt,
        subtitle
      FROM amenities_content
      ORDER BY id ASC
      LIMIT 1
      `
    );
    const rows = result.rows;

    res.json(rows[0] || defaultAmenitiesContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load amenities content' });
  }
}

async function getAdminAmenitiesContent(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_content ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      ORDER BY ac.id ASC
      LIMIT 1
      `
    );
    const rows = result.rows;

    res.json(rows[0] || defaultAmenitiesContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load amenities content' });
  }
}

async function saveAmenitiesContent(req, res) {
  try {
    const {
      eyebrow,
      title,
      image_url,
      image_alt,
      subtitle
    } = req.body;

    if (!eyebrow || !title) {
      return res.status(400).json({
        message: 'Eyebrow and title are required'
      });
    }

    // Validate URL if provided
    if (image_url && !validateUrl(image_url)) {
      return res.status(400).json({
        message: 'Invalid image URL format'
      });
    }

    const existingResult = await pool.query(
      'SELECT id FROM amenities_content ORDER BY id ASC LIMIT 1'
    );
    const existingRows = existingResult.rows;

    if (existingRows.length) {
      const existingId = existingRows[0].id;

      await pool.query(
        `
        UPDATE amenities_content
        SET
          eyebrow = $1,
          title = $2,
          image_url = $3,
          image_alt = $4,
          subtitle = $5,
          updated_by = $6,
          updated_at = NOW()
        WHERE id = $7
        `,
        [
          eyebrow,
          title,
          image_url || null,
          image_alt || null,
          subtitle || null,
          req.user.id,
          existingId
        ]
      );
    } else {
      await pool.query(
        `
        INSERT INTO amenities_content (
          eyebrow,
          title,
          image_url,
          image_alt,
          subtitle,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          eyebrow,
          title,
          image_url || null,
          image_alt || null,
          subtitle || null,
          req.user.id
        ]
      );
    }

    const result = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_content ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      ORDER BY ac.id ASC
      LIMIT 1
      `
    );
    const rows = result.rows;

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save amenities content' });
  }
}

module.exports = {
  getPublicAmenitiesContent,
  getAdminAmenitiesContent,
  saveAmenitiesContent
};

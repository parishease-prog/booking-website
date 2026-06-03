const pool = require('../config/db');
const { validateUrl, validateText } = require('../utils/validation');

async function getPublicHomepageSlides(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        title,
        subtitle,
        image_url,
        alt_text,
        button_label,
        button_link,
        sort_order
      FROM homepage_slides
      WHERE is_active = true
      ORDER BY sort_order ASC, id ASC
      `
    );
    const rows = result.rows;

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load homepage slides' });
  }
}

async function getAdminHomepageSlides(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        hs.*,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name
      FROM homepage_slides hs
      LEFT JOIN users creator ON creator.id = hs.created_by
      LEFT JOIN users updater ON updater.id = hs.updated_by
      ORDER BY hs.sort_order ASC, hs.id ASC
      `
    );
    const rows = result.rows;

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load homepage slides' });
  }
}

async function createHomepageSlide(req, res) {
  try {
    const {
      title,
      subtitle,
      image_url,
      alt_text,
      button_label,
      button_link,
      sort_order,
      is_active
    } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({ message: 'Title and image URL are required' });
    }

    // Validate URL format
    if (!validateUrl(image_url)) {
      return res.status(400).json({ message: 'Invalid image URL format' });
    }

    const result = await pool.query(
      `
      INSERT INTO homepage_slides (
        title,
        subtitle,
        image_url,
        alt_text,
        button_label,
        button_link,
        sort_order,
        is_active,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        title,
        subtitle || null,
        image_url,
        alt_text || null,
        button_label || null,
        button_link || null,
        Number(sort_order || 1),
        is_active ? 1 : 0,
        req.user.id,
        req.user.id
      ]
    );
    const slideId = result.rows[0].id;

    const rows_result = await pool.query(
      'SELECT * FROM homepage_slides WHERE id = $1 LIMIT 1',
      [slideId]
    );
    const rows = rows_result.rows;

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create homepage slide' });
  }
}

async function updateHomepageSlide(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      image_url,
      alt_text,
      button_label,
      button_link,
      sort_order,
      is_active
    } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({ message: 'Title and image URL are required' });
    }

    // Validate URL format
    if (!validateUrl(image_url)) {
      return res.status(400).json({ message: 'Invalid image URL format' });
    }

    const result = await pool.query(
      `
      UPDATE homepage_slides
      SET
        title = $1,
        subtitle = $2,
        image_url = $3,
        alt_text = $4,
        button_label = $5,
        button_link = $6,
        sort_order = $7,
        is_active = $8,
        updated_by = $9,
        updated_at = NOW()
      WHERE id = $10
      `,
      [
        title,
        subtitle || null,
        image_url,
        alt_text || null,
        button_label || null,
        button_link || null,
        Number(sort_order || 1),
        is_active ? 1 : 0,
        req.user.id,
        id
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Homepage slide not found' });
    }

    const rows_result = await pool.query(
      'SELECT * FROM homepage_slides WHERE id = $1 LIMIT 1',
      [id]
    );
    const rows = rows_result.rows;

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update homepage slide' });
  }
}

async function deleteHomepageSlide(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM homepage_slides WHERE id = $1',
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Homepage slide not found' });
    }

    res.json({ message: 'Homepage slide deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete homepage slide' });
  }
}

module.exports = {
  getPublicHomepageSlides,
  getAdminHomepageSlides,
  createHomepageSlide,
  updateHomepageSlide,
  deleteHomepageSlide
};

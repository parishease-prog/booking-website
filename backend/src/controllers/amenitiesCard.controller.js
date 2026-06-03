const pool = require('../config/db');
const { validateUrl, validateText } = require('../utils/validation');

async function getPublicAmenitiesCards(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        sort_order
      FROM amenities_cards
      WHERE is_active = true
      ORDER BY sort_order ASC, id ASC
      `
    );
    const cardRows = result.rows;

    const result_images = await pool.query(
      `
      SELECT
        id,
        amenities_card_id,
        image_url,
        alt_text,
        sort_order
      FROM amenities_card_images
      WHERE is_active = true
      ORDER BY amenities_card_id ASC, sort_order ASC, id ASC
      `
    );
    const imageRows = result_images.rows;

    const imagesByCardId = imageRows.reduce((acc, image) => {
      if (!acc[image.amenities_card_id]) {
        acc[image.amenities_card_id] = [];
      }

      acc[image.amenities_card_id].push(image);
      return acc;
    }, {});

    res.json(
      cardRows.map((card) => ({
        ...card,
        images: imagesByCardId[card.id] || []
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load amenities cards' });
  }
}

async function getAdminAmenitiesCards(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_cards ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      ORDER BY ac.sort_order ASC, ac.id ASC
      `
    );
    const cardRows = result.rows;

    const result_images = await pool.query(
      `
      SELECT *
      FROM amenities_card_images
      ORDER BY amenities_card_id ASC, sort_order ASC, id ASC
      `
    );
    const imageRows = result_images.rows;

    const imagesByCardId = imageRows.reduce((acc, image) => {
      if (!acc[image.amenities_card_id]) {
        acc[image.amenities_card_id] = [];
      }

      acc[image.amenities_card_id].push(image);
      return acc;
    }, {});

    res.json(
      cardRows.map((card) => ({
        ...card,
        images: imagesByCardId[card.id] || []
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load admin amenities cards' });
  }
}

async function createAmenitiesCard(req, res) {
  const client = await pool.connect();

  try {
    const {
      title,
      description,
      sort_order,
      is_active,
      images
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Validate text lengths
    if (!validateText(title, 100)) {
      return res.status(400).json({ message: 'Title must be 1-100 characters' });
    }

    if (!validateText(description, 500)) {
      return res.status(400).json({ message: 'Description must be 1-500 characters' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `
      INSERT INTO amenities_cards (
        title,
        description,
        sort_order,
        is_active,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        title.trim(),
        description.trim(),
        Number(sort_order || 1),
        is_active ? 1 : 0,
        req.user.id
      ]
    );

    const cardId = result.rows[0].id;
    const normalizedImages = Array.isArray(images) ? images : [];

    for (const image of normalizedImages) {
      if (!image.image_url) {
        continue;
      }

      // Validate image URL format
      if (!validateUrl(image.image_url)) {
        continue; // Skip invalid URLs
      }

      await client.query(
        `
        INSERT INTO amenities_card_images (
          amenities_card_id,
          image_url,
          alt_text,
          sort_order,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          cardId,
          image.image_url,
          image.alt_text || null,
          Number(image.sort_order || 1),
          image.is_active === false ? 0 : 1
        ]
      );
    }

    await client.query('COMMIT');

    const rows_result = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_cards ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      WHERE ac.id = $1
      LIMIT 1
      `,
      [cardId]
    );
    const rows = rows_result.rows;

    const imageRows_result = await pool.query(
      `
      SELECT *
      FROM amenities_card_images
      WHERE amenities_card_id = $1
      ORDER BY sort_order ASC, id ASC
      `,
      [cardId]
    );
    const imageRows = imageRows_result.rows;

    res.status(201).json({
      ...rows[0],
      images: imageRows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to create amenities card' });
  } finally {
    client.release();
  }
}

async function updateAmenitiesCard(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      title,
      description,
      sort_order,
      is_active,
      images
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `
      UPDATE amenities_cards
      SET
        title = $1,
        description = $2,
        sort_order = $3,
        is_active = $4,
        updated_by = $5,
        updated_at = NOW()
      WHERE id = $6
      `,
      [
        title,
        description,
        Number(sort_order || 1),
        is_active ? 1 : 0,
        req.user.id,
        id
      ]
    );

    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Amenities card not found' });
    }

    await client.query(
      'DELETE FROM amenities_card_images WHERE amenities_card_id = $1',
      [id]
    );

    const normalizedImages = Array.isArray(images) ? images : [];

    for (const image of normalizedImages) {
      if (!image.image_url) {
        continue;
      }

      await client.query(
        `
        INSERT INTO amenities_card_images (
          amenities_card_id,
          image_url,
          alt_text,
          sort_order,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          id,
          image.image_url,
          image.alt_text || null,
          Number(image.sort_order || 1),
          image.is_active === false ? 0 : 1
        ]
      );
    }

    await client.query('COMMIT');

    const rows_result = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_cards ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      WHERE ac.id = $1
      LIMIT 1
      `,
      [id]
    );
    const rows = rows_result.rows;

    const imageRows_result = await pool.query(
      `
      SELECT *
      FROM amenities_card_images
      WHERE amenities_card_id = $1
      ORDER BY sort_order ASC, id ASC
      `,
      [id]
    );
    const imageRows = imageRows_result.rows;

    res.json({
      ...rows[0],
      images: imageRows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to update amenities card' });
  } finally {
    client.release();
  }
}

async function deleteAmenitiesCard(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM amenities_cards WHERE id = $1',
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Amenities card not found' });
    }

    res.json({ message: 'Amenities card deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete amenities card' });
  }
}

module.exports = {
  getPublicAmenitiesCards,
  getAdminAmenitiesCards,
  createAmenitiesCard,
  updateAmenitiesCard,
  deleteAmenitiesCard
};

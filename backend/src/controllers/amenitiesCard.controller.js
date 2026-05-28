const pool = require('../config/db');
const { validateUrl, validateText } = require('../utils/validation');

async function getPublicAmenitiesCards(req, res) {
  try {
    const [cardRows] = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        sort_order
      FROM amenities_cards
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    const [imageRows] = await pool.query(
      `
      SELECT
        id,
        amenities_card_id,
        image_url,
        alt_text,
        sort_order
      FROM amenities_card_images
      WHERE is_active = 1
      ORDER BY amenities_card_id ASC, sort_order ASC, id ASC
      `
    );

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
    const [cardRows] = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_cards ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      ORDER BY ac.sort_order ASC, ac.id ASC
      `
    );

    const [imageRows] = await pool.query(
      `
      SELECT *
      FROM amenities_card_images
      ORDER BY amenities_card_id ASC, sort_order ASC, id ASC
      `
    );

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
  const connection = await pool.getConnection();

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

    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      INSERT INTO amenities_cards (
        title,
        description,
        sort_order,
        is_active,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        title.trim(),
        description.trim(),
        Number(sort_order || 1),
        is_active ? 1 : 0,
        req.user.id
      ]
    );

    const cardId = result.insertId;
    const normalizedImages = Array.isArray(images) ? images : [];

    for (const image of normalizedImages) {
      if (!image.image_url) {
        continue;
      }

      // Validate image URL format
      if (!validateUrl(image.image_url)) {
        continue; // Skip invalid URLs
      }

      await connection.query(
        `
        INSERT INTO amenities_card_images (
          amenities_card_id,
          image_url,
          alt_text,
          sort_order,
          is_active
        )
        VALUES (?, ?, ?, ?, ?)
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

    await connection.commit();

    const [rows] = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_cards ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      WHERE ac.id = ?
      LIMIT 1
      `,
      [cardId]
    );

    const [imageRows] = await pool.query(
      `
      SELECT *
      FROM amenities_card_images
      WHERE amenities_card_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [cardId]
    );

    res.status(201).json({
      ...rows[0],
      images: imageRows
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to create amenities card' });
  } finally {
    connection.release();
  }
}

async function updateAmenitiesCard(req, res) {
  const connection = await pool.getConnection();

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

    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      UPDATE amenities_cards
      SET
        title = ?,
        description = ?,
        sort_order = ?,
        is_active = ?,
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ?
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

    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: 'Amenities card not found' });
    }

    await connection.query(
      'DELETE FROM amenities_card_images WHERE amenities_card_id = ?',
      [id]
    );

    const normalizedImages = Array.isArray(images) ? images : [];

    for (const image of normalizedImages) {
      if (!image.image_url) {
        continue;
      }

      await connection.query(
        `
        INSERT INTO amenities_card_images (
          amenities_card_id,
          image_url,
          alt_text,
          sort_order,
          is_active
        )
        VALUES (?, ?, ?, ?, ?)
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

    await connection.commit();

    const [rows] = await pool.query(
      `
      SELECT
        ac.*,
        updater.full_name AS updated_by_name
      FROM amenities_cards ac
      LEFT JOIN users updater ON updater.id = ac.updated_by
      WHERE ac.id = ?
      LIMIT 1
      `,
      [id]
    );

    const [imageRows] = await pool.query(
      `
      SELECT *
      FROM amenities_card_images
      WHERE amenities_card_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [id]
    );

    res.json({
      ...rows[0],
      images: imageRows
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to update amenities card' });
  } finally {
    connection.release();
  }
}

async function deleteAmenitiesCard(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'DELETE FROM amenities_cards WHERE id = ?',
      [id]
    );

    if (!result.affectedRows) {
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

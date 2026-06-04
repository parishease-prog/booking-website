const pool = require('../config/db');
const { validateEnum } = require('../utils/enums');
const { validateEmail, validatePhone, validateText } = require('../utils/validation');

async function getInquiries(req, res) {
  try {
    const { status } = req.query;
    const params = [];
    const where = [];

    if (status) {
      where.push('status = $1');
      params.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT id, full_name, email, phone, subject, message, status, reviewed_at, review_notes, created_at
      FROM inquiries
      ${whereClause}
      ORDER BY created_at DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch inquiries' });
  }
}

async function getInquiry(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM inquiries
      WHERE id = $1
      `,
      [id]
    );
    const rows = result.rows;

    if (!rows.length) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Mark as responded if it was pending
    if (rows[0].status === 'pending') {
      await pool.query('UPDATE inquiries SET status = $1 WHERE id = $2', ['responded', id]);
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch inquiry' });
  }
}

async function createInquiry(req, res) {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'name, email, subject, and message are required'
      });
    }

    // Validate name format
    const validatedName = validateText(name, 100);
    if (!validatedName) {
      return res.status(400).json({ message: 'Name must be 1-100 characters' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone format if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: 'Invalid phone format' });
    }

    // Validate subject format
    const validatedSubject = validateText(subject, 200);
    if (!validatedSubject) {
      return res.status(400).json({ message: 'Subject must be 1-200 characters' });
    }

    // Validate message format
    const validatedMessage = validateText(message, 2000);
    if (!validatedMessage) {
      return res.status(400).json({ message: 'Message must be 1-2000 characters' });
    }

    const result = await pool.query(
      `
      INSERT INTO inquiries (full_name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [validatedName, email, phone || null, validatedSubject, validatedMessage]
    );

    res.status(201).json({
      message: 'Inquiry submitted successfully',
      inquiry_id: result.rows[0].id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create inquiry' });
  }
}

async function updateInquiry(req, res) {
  try {
    const { id } = req.params;
    const { status, response_notes } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    if (!status && !response_notes) {
      return res.status(400).json({
        message: 'At least one of status or response_notes is required'
      });
    }

    // Validate status is valid if provided
    if (status) {
      try {
        validateEnum('inquiry_status', status, 'status');
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    // Build SET clause safely - using numbered parameters
    // Build SET clause safely - using numbered parameters
    const setClauses = [];
    const params = [];
    let paramCounter = 1;

    if (status) {
      setClauses.push(`status = $${paramCounter++}`);
      params.push(status);
    }

    if (response_notes !== undefined) {
      setClauses.push(`review_notes = $${paramCounter++}`);
      params.push(response_notes || null);
    }

    if (status === 'responded') {
      setClauses.push(`reviewed_at = NOW()`);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const setClause = setClauses.join(', ');
    params.push(id);

    const result = await pool.query(
      `UPDATE inquiries SET ${setClause} WHERE id = $${paramCounter}`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    res.json({ message: 'Inquiry updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update inquiry' });
  }
}

async function deleteInquiry(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    const result = await pool.query(
      `DELETE FROM inquiries WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete inquiry' });
  }
}

async function getInquiriesByEmail(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const result = await pool.query(
      `
      SELECT id, full_name, email, phone, subject, message, status, reviewed_at, review_notes, created_at
      FROM inquiries
      WHERE email = $1
      ORDER BY created_at DESC
      `,
      [email]
    );

    console.log(`[DEBUG] getInquiriesByEmail for ${email}: found ${result.rows.length} inquiries`);
    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] getInquiriesByEmail:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries' });
  }
}

module.exports = {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getInquiriesByEmail
};

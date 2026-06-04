const pool = require('../config/db');
const { updateReservationPaymentSummary } = require('../utils/booking');
const { logActivity } = require('../utils/activity');
const { validateEnum } = require('../utils/enums');
const crypto = require('node:crypto');

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';

function normalizeWebhookSignature(signatureHeader = '') {
  return String(signatureHeader || '').replace(/^sha256=/i, '').trim();
}

function verifyWebhookSignature(req) {
  if (!WEBHOOK_SECRET) {
    return true;
  }

  const header = normalizeWebhookSignature(req.headers['x-webhook-signature']);
  if (!header) {
    return false;
  }

  const rawBody = req.rawBody || '';
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const headerBuffer = Buffer.from(header, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (headerBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
}

async function getPayments(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        r.reservation_code
      FROM payments p
      JOIN reservations r ON r.id = p.reservation_id
      ORDER BY p.created_at DESC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
}

async function getAdminPayments(req, res) {
  try {
    const { reservation_id, reservation_code } = req.query;
    const conditions = [];
    const params = [];

    if (reservation_id) {
      conditions.push('p.reservation_id = $1');
      params.push(Number(reservation_id));
    }

    if (reservation_code) {
      conditions.push('r.reservation_code = $' + (conditions.length + 1));
      params.push(String(reservation_code));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        p.*,
        r.reservation_code,
        g.first_name || ' ' || g.last_name AS guest_name,
        g.email AS guest_email,
        recorder.full_name AS recorded_by_name
      FROM payments p
      JOIN reservations r ON r.id = p.reservation_id
      JOIN guests g ON g.id = r.guest_id
      LEFT JOIN users recorder ON recorder.id = p.recorded_by_user_id
      ${whereClause}
      ORDER BY p.created_at DESC, p.id DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
}

async function createPayment(req, res) {
  const client = await pool.connect();

  try {
    const {
      reservation_id,
      reservation_code,
      payment_method,
      payment_channel,
      amount,
      reference_number,
      proof_image_url,
      notes
    } = req.body;

    if ((!reservation_id && !reservation_code) || !payment_method || !amount) {
      return res.status(400).json({
        message: 'reservation_id (or reservation_code), payment_method, and amount are required'
      });
    }

    // Guest submissions are always recorded as pending.
    // Admin-paid/partial/refunded states should be applied via admin endpoints or verified webhooks.
    const payment_status = 'pending';
    const provider = 'guest_submission';
    const provider_event_id = null;

    // Validate enum values
    try {
      validateEnum('payment_method', payment_method, 'payment_method');
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    await client.query('BEGIN');

    const reservationResult = await client.query(
      `
      SELECT id
      FROM reservations
      WHERE (($1::integer IS NOT NULL AND id = $1) OR ($2::text IS NOT NULL AND reservation_code = $2))
      LIMIT 1
      `,
      [
        reservation_id ?? null,
        reservation_code ?? null
      ]
    );

    if (!reservationResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const resolvedReservationId = reservationResult.rows[0].id;

    const result = await client.query(
      `
      INSERT INTO payments (
        reservation_id,
        payment_method,
        payment_channel,
        amount,
        payment_status,
        reference_number,
        proof_image_url,
        paid_at,
        recorded_by_user_id,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        resolvedReservationId,
        payment_method,
        payment_channel || null,
        numericAmount,
        payment_status,
        reference_number || null,
        proof_image_url || null,
        null, // paid_at (guest submissions are not considered paid)
        null, // recorded_by_user_id
        notes || null
      ]
    );

    await updateReservationPaymentSummary(client, resolvedReservationId);

    await logActivity(client, {
      userId: null,
      entityType: 'payment',
      entityId: result.rows[0].id,
      action: 'create_payment',
      description: `Guest submitted pending payment for reservation ${resolvedReservationId}`
    });

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment_id: result.rows[0].id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to record payment' });
  } finally {
    client.release();
  }
}

async function createAdminPayment(req, res) {
  const client = await pool.connect();

  try {
    const {
      reservation_id,
      payment_method,
      payment_channel,
      provider,
      provider_event_id,
      amount,
      payment_status = 'paid',
      reference_number,
      proof_image_url,
      notes
    } = req.body;

    if (!reservation_id || !payment_method || amount === undefined || amount === null) {
      return res.status(400).json({
        message: 'reservation_id, payment_method, and amount are required'
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    await client.query('BEGIN');

    if (provider_event_id) {
      const existingResult = await client.query(
        'SELECT id FROM payments WHERE provider_event_id = $1 LIMIT 1',
        [provider_event_id]
      );

      if (existingResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(200).json({
          message: 'Payment event already recorded',
          payment_id: existingResult.rows[0].id
        });
      }
    }

    const reservationResult = await client.query(
      'SELECT id FROM reservations WHERE id = $1 LIMIT 1',
      [reservation_id]
    );

    if (!reservationResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const result = await client.query(
      `
      INSERT INTO payments (
        reservation_id,
        payment_method,
        payment_channel,
        amount,
        payment_status,
        reference_number,
        proof_image_url,
        paid_at,
        recorded_by_user_id,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
      RETURNING id
      `,
      [
        reservation_id,
        payment_method,
        payment_channel || null,
        numericAmount,
        payment_status,
        reference_number || null,
        proof_image_url || null,
        req.user?.id || null,
        notes || null
      ]
    );

    await updateReservationPaymentSummary(client, reservation_id);

    await logActivity(client, {
      userId: req.user?.id || null,
      entityType: 'payment',
      entityId: result.rows[0].id,
      action: 'admin_record_payment',
      description: `Admin recorded ${payment_status} payment for reservation ${reservation_id}`
    });

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment_id: result.rows[0].id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to record payment' });
  } finally {
    client.release();
  }
}

async function handlePaymentWebhook(req, res) {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  const payload = req.body || {};
  const provider = String(payload.provider || 'generic').trim().toLowerCase();
  const eventId = String(payload.event_id || payload.id || '').trim();

  if (!eventId) {
    return res.status(400).json({ message: 'event_id is required' });
  }

  let eventRecordId = null;

  try {
    const eventResult = await pool.query(
      `
      INSERT INTO payment_webhook_events (
        provider,
        event_id,
        processing_status,
        payload_json
      )
      VALUES ($1, $2, 'received', $3)
      RETURNING id
      `,
      [provider, eventId, JSON.stringify(payload)]
    );
    eventRecordId = eventResult.rows[0].id;
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(200).json({ message: 'Webhook event already processed' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Failed to register webhook event' });
  }

  const client = await pool.connect();

  try {
    const amount = Number(payload.amount);
    const paymentStatus = String(payload.payment_status || payload.status || 'paid').toLowerCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('amount must be a positive number');
    }

    await client.query('BEGIN');

    const reservationResult = await client.query(
      `
      SELECT id
      FROM reservations
      WHERE id = $1 OR reservation_code = $2
      LIMIT 1
      `,
      [payload.reservation_id || null, payload.reservation_code || null]
    );

    if (!reservationResult.rows.length) {
      throw new Error('Reservation for webhook payload was not found');
    }

    const reservationId = reservationResult.rows[0].id;

    let paymentId = null;
    // Webhook events table will handle duplicate detection via UNIQUE constraint on (provider, event_id)
    const paymentResult = await client.query(
      `
      INSERT INTO payments (
        reservation_id,
        payment_method,
        payment_channel,
        amount,
        payment_status,
        reference_number,
        proof_image_url,
        paid_at,
        recorded_by_user_id,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NULL, $8)
      RETURNING id
      `,
      [
        reservationId,
        payload.payment_method || 'e_wallet',
        payload.payment_channel || null,
        amount,
        paymentStatus,
        payload.reference_number || null,
        payload.proof_image_url || null,
        payload.notes || 'Recorded via webhook'
      ]
    );
    paymentId = paymentResult.rows[0].id;

    await updateReservationPaymentSummary(client, reservationId);

    await client.query(
      `
      UPDATE payment_webhook_events
      SET
        reservation_id = $1,
        payment_id = $2,
        processing_status = 'processed',
        error_message = NULL,
        processed_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [reservationId, paymentId, eventRecordId]
    );

    await logActivity(client, {
      userId: null,
      entityType: 'payment',
      entityId: paymentId,
      action: 'webhook_payment_processed',
      description: `Webhook ${provider}:${eventId} processed for reservation ${reservationId}`
    });

    await client.query('COMMIT');
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);

    if (eventRecordId) {
      await pool.query(
        `
        UPDATE payment_webhook_events
        SET processing_status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [String(error.message || 'Webhook processing failed').slice(0, 255), eventRecordId]
      );
    }

    res.status(500).json({ message: error.message || 'Failed to process webhook' });
  } finally {
    client.release();
  }
}

async function refundAdminPayment(req, res) {
  const client = await pool.connect();

  try {
    const paymentId = Number(req.params.id);
    const requestedAmount = req.body?.amount;
    const notes = req.body?.notes || null;

    await client.query('BEGIN');

    const paymentResult = await client.query(
      `
      SELECT *
      FROM payments
      WHERE id = $1
      LIMIT 1
      `,
      [paymentId]
    );

    if (!paymentResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (!['paid', 'partial'].includes(payment.payment_status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only paid or partial payments can be refunded' });
    }

    const refundAmount = requestedAmount == null
      ? Number(payment.amount)
      : Number(requestedAmount);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > Number(payment.amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Refund amount is invalid' });
    }

    const refundResult = await client.query(
      `
      INSERT INTO payments (
        reservation_id,
        payment_method,
        payment_channel,
        amount,
        payment_status,
        reference_number,
        paid_at,
        recorded_by_user_id,
        notes
      )
      VALUES ($1, $2, $3, $4, 'refunded', $5, NOW(), $6, $7)
      RETURNING id
      `,
      [
        payment.reservation_id,
        payment.payment_method,
        payment.payment_channel,
        refundAmount,
        `RFND-${payment.id}-${Date.now()}`,
        req.user?.id || null,
        notes || `Refund for payment #${payment.id}`
      ]
    );

    await updateReservationPaymentSummary(client, payment.reservation_id);

    await logActivity(client, {
      userId: req.user?.id || null,
      entityType: 'payment',
      entityId: refundResult.rows[0].id,
      action: 'admin_refund_payment',
      description: `Refunded ${refundAmount} from payment ${payment.id}`
    });

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Refund recorded successfully',
      refund_payment_id: refundResult.rows[0].id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to record refund' });
  } finally {
    client.release();
  }
}

async function approveAdminPayment(req, res) {
  const client = await pool.connect();

  try {
    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: 'Invalid payment id' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT id, reservation_id, payment_status
      FROM payments
      WHERE id = $1
      LIMIT 1
      `,
      [paymentId]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.rows[0];

    if (payment.payment_status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Payment is already marked as paid' });
    }

    if (payment.payment_status === 'refunded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Refunded payments cannot be approved' });
    }

    await client.query(
      `
      UPDATE payments
      SET
        payment_status = 'paid',
        paid_at = COALESCE(paid_at, NOW()),
        recorded_by_user_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [req.user?.id || null, paymentId]
    );

    await updateReservationPaymentSummary(client, payment.reservation_id);

    await logActivity(client, {
      userId: req.user?.id || null,
      entityType: 'payment',
      entityId: paymentId,
      action: 'admin_approve_payment',
      description: `Admin approved payment ${paymentId} for reservation ${payment.reservation_id}`
    });

    await client.query('COMMIT');
    res.status(200).json({ message: 'Payment approved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to approve payment' });
  } finally {
    client.release();
  }
}

async function declineAdminPayment(req, res) {
  const client = await pool.connect();

  try {
    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: 'Invalid payment id' });
    }

    const notes = req.body?.notes ? String(req.body.notes).slice(0, 2000) : null;

    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT id, reservation_id, payment_status
      FROM payments
      WHERE id = $1
      LIMIT 1
      `,
      [paymentId]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.rows[0];

    if (payment.payment_status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Paid payments cannot be declined' });
    }

    if (payment.payment_status === 'refunded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Refunded payments cannot be declined' });
    }

    if (payment.payment_status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Only pending payments can be declined (current: ${payment.payment_status})` });
    }

    await client.query(
      `
      UPDATE payments
      SET
        payment_status = 'failed',
        paid_at = NULL,
        recorded_by_user_id = $1,
        notes = COALESCE($2, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [req.user?.id || null, notes, paymentId]
    );

    await updateReservationPaymentSummary(client, payment.reservation_id);

    await logActivity(client, {
      userId: req.user?.id || null,
      entityType: 'payment',
      entityId: paymentId,
      action: 'admin_decline_payment',
      description: `Admin declined payment ${paymentId} for reservation ${payment.reservation_id}`
    });

    await client.query('COMMIT');
    res.status(200).json({ message: 'Payment declined successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to decline payment' });
  } finally {
    client.release();
  }
}

module.exports = {
  getPayments,
  getAdminPayments,
  createPayment,
  createAdminPayment,
  handlePaymentWebhook,
  approveAdminPayment,
  declineAdminPayment,
  refundAdminPayment
};

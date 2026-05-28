const pool = require('../config/db');
const {
  validateDateRange,
  validateOccupancy,
  generateReservationCode,
  generateConfirmationCode,
  generateHoldToken,
  calculateNights,
  normalizeRoomIds,
  getAvailableRoomsQuery,
  expireStaleHolds,
  fetchReservationDetails
} = require('../utils/booking');
const { logActivity } = require('../utils/activity');
const { validatePhone, validateEmail } = require('../utils/validation');
const { validateEnum } = require('../utils/enums');

const CANCELLATION_MIN_HOURS = Number(process.env.CANCELLATION_MIN_HOURS || 24);
const BOOKING_HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 15);

function normalizeSqlDate(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

async function getReservations(req, res) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.reservation_code,
        r.booking_scope,
        r.booking_source,
        r.check_in_date,
        r.check_out_date,
        r.reservation_status,
        r.payment_status,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
        g.email AS guest_email
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      ORDER BY r.created_at DESC
      `
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }
}

async function getReservationById(req, res) {
  try {
    const reservation = await fetchReservationDetails(
      pool,
      'r.id = ?',
      [req.params.id]
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch reservation' });
  }
}

async function getReservationByCode(req, res) {
  try {
    const reservation = await fetchReservationDetails(
      pool,
      'r.reservation_code = ?',
      [req.params.code]
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch reservation by code' });
  }
}

async function createReservation(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      check_in_date,
      check_out_date,
      room_ids,
      adult_count,
      child_count,
      special_requests,
      hold_token
    } = req.body;

    let normalizedRoomIds = normalizeRoomIds(room_ids);
    const dateError = validateDateRange(check_in_date, check_out_date);

    if (
      !first_name ||
      !last_name ||
      !email ||
      !check_in_date ||
      !check_out_date ||
      (normalizedRoomIds.length === 0 && !hold_token)
    ) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone format if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    await connection.beginTransaction();

    await expireStaleHolds(connection);

    if (hold_token) {
      const [holdRows] = await connection.query(
        `
        SELECT
          id,
          hold_token,
          status,
          DATE_FORMAT(check_in_date, '%Y-%m-%d') AS check_in_date,
          DATE_FORMAT(check_out_date, '%Y-%m-%d') AS check_out_date,
          expires_at
        FROM reservation_holds
        WHERE hold_token = ?
        LIMIT 1
        FOR UPDATE
        `,
        [hold_token]
      );

      if (!holdRows.length) {
        await connection.rollback();
        return res.status(404).json({ message: 'Hold not found' });
      }

      const hold = holdRows[0];

      if (hold.status !== 'active' || new Date(hold.expires_at) <= new Date()) {
        await connection.query(
          `
          UPDATE reservation_holds
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'active'
          `,
          [hold.id]
        );
        await connection.rollback();
        return res.status(400).json({ message: 'Hold has expired. Please re-check availability.' });
      }

      if (hold.check_in_date !== check_in_date || hold.check_out_date !== check_out_date) {
        await connection.rollback();
        return res.status(400).json({ message: 'Hold dates do not match the reservation dates' });
      }

      const [holdRoomRows] = await connection.query(
        `
        SELECT room_id
        FROM reservation_hold_rooms
        WHERE hold_id = ?
        ORDER BY room_id ASC
        `,
        [hold.id]
      );

      const heldRoomIds = holdRoomRows.map((row) => Number(row.room_id));

      if (!heldRoomIds.length) {
        await connection.rollback();
        return res.status(400).json({ message: 'Hold has no rooms assigned' });
      }

      if (normalizedRoomIds.length) {
        const requested = [...normalizedRoomIds].sort((a, b) => a - b).join(',');
        const held = [...heldRoomIds].sort((a, b) => a - b).join(',');
        if (requested !== held) {
          await connection.rollback();
          return res.status(400).json({ message: 'Selected rooms do not match held rooms' });
        }
      }

      normalizedRoomIds = heldRoomIds;
    }

    if (!normalizedRoomIds.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'At least one room must be selected' });
    }

    await connection.query(
      `
      SELECT id
      FROM rooms
      WHERE id IN (${normalizedRoomIds.map(() => '?').join(',')})
      FOR UPDATE
      `,
      normalizedRoomIds
    );

    const [availableRooms] = await getAvailableRoomsQuery(connection, {
      checkInDate: check_in_date,
      checkOutDate: check_out_date,
      roomIds: normalizedRoomIds,
      ignoreHoldToken: hold_token || null
    });

    if (availableRooms.length !== normalizedRoomIds.length) {
      await connection.rollback();
      return res.status(400).json({
        message: 'One or more selected rooms are not available',
        requested_room_ids: normalizedRoomIds,
        matched_rooms: availableRooms.map((room) => room.id)
      });
    }

    // Validate guest count against room capacities
    for (const room of availableRooms) {
      const occupancyError = validateOccupancy(
        adult_count,
        child_count,
        room.base_capacity,
        room.max_capacity
      );
      if (occupancyError) {
        await connection.rollback();
        return res.status(400).json({ message: occupancyError });
      }
    }

    let guestId;

    const [existingGuests] = await connection.query(
      'SELECT id FROM guests WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingGuests.length > 0) {
      guestId = existingGuests[0].id;

      await connection.query(
        `
        UPDATE guests
        SET
          first_name = ?,
          last_name = ?,
          phone = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [first_name, last_name, phone || null, guestId]
      );
    } else {
      const [guestResult] = await connection.query(
        `
        INSERT INTO guests (first_name, last_name, email, phone)
        VALUES (?, ?, ?, ?)
        `,
        [first_name, last_name, email, phone || null]
      );

      guestId = guestResult.insertId;
    }

    const nights = calculateNights(check_in_date, check_out_date);
    const subtotal = availableRooms.reduce((sum, room) => {
      return sum + Number(room.effective_price) * nights;
    }, 0);

    const reservationCode = generateReservationCode();
    const bookingScope =
      normalizedRoomIds.length === 1 ? 'single_room' : 'multi_room';

    const [reservationResult] = await connection.query(
      `
      INSERT INTO reservations (
        reservation_code,
        guest_id,
        booking_scope,
        booking_source,
        arrival_type,
        check_in_date,
        check_out_date,
        adult_count,
        child_count,
        special_requests,
        reservation_status,
        payment_status,
        subtotal_amount,
        total_amount,
        amount_paid,
        balance_due
      )
      VALUES (?, ?, ?, 'online', 'advance', ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, 0, ?)
      `,
      [
        reservationCode,
        guestId,
        bookingScope,
        check_in_date,
        check_out_date,
        adult_count || 1,
        child_count || 0,
        special_requests || null,
        subtotal,
        subtotal,
        subtotal
      ]
    );

    const reservationId = reservationResult.insertId;

    if (hold_token) {
      await connection.query(
        `
        UPDATE reservation_holds
        SET status = 'converted', reservation_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE hold_token = ?
        `,
        [reservationId, hold_token]
      );
    }

    for (const room of availableRooms) {
      const lineTotal = Number(room.effective_price) * nights;

      await connection.query(
        `
        INSERT INTO reservation_rooms (
          reservation_id,
          room_id,
          nightly_rate,
          nights,
          adult_count,
          child_count,
          extra_guest_count,
          line_total,
          room_status,
          check_in_date,
          check_out_date
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'reserved', ?, ?)
        `,
        [
          reservationId,
          room.id,
          room.effective_price,
          nights,
          adult_count || 1,
          child_count || 0,
          lineTotal,
          check_in_date,
          check_out_date
        ]
      );
    }

    await connection.query(
      `
      INSERT INTO reservation_status_history (
        reservation_id,
        old_status,
        new_status,
        notes
      )
      VALUES (?, NULL, 'pending', 'Reservation created')
      `,
      [reservationId]
    );

    await logActivity(connection, {
      userId: null,
      entityType: 'reservation',
      entityId: reservationId,
      action: 'create_reservation',
      description: `Reservation ${reservationCode} created via online booking`
    });

    await connection.commit();

    res.status(201).json({
      message: 'Reservation created successfully',
      reservation_code: reservationCode,
      reservation_id: reservationId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({
      message: 'Failed to create reservation',
      error: error.message
    });
  } finally {
    connection.release();
  }
}

async function createReservationHold(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
      check_in_date,
      check_out_date,
      room_ids,
      guest_email
    } = req.body;

    const normalizedRoomIds = normalizeRoomIds(room_ids);
    const dateError = validateDateRange(check_in_date, check_out_date);

    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    if (!normalizedRoomIds.length) {
      return res.status(400).json({ message: 'room_ids must include at least one room' });
    }

    await connection.beginTransaction();
    await expireStaleHolds(connection);

    await connection.query(
      `
      SELECT id
      FROM rooms
      WHERE id IN (${normalizedRoomIds.map(() => '?').join(',')})
      FOR UPDATE
      `,
      normalizedRoomIds
    );

    const [availableRooms] = await getAvailableRoomsQuery(connection, {
      checkInDate: check_in_date,
      checkOutDate: check_out_date,
      roomIds: normalizedRoomIds
    });

    if (availableRooms.length !== normalizedRoomIds.length) {
      await connection.rollback();
      return res.status(409).json({
        message: 'One or more selected rooms are no longer available',
        requested_room_ids: normalizedRoomIds,
        matched_rooms: availableRooms.map((room) => room.id)
      });
    }

    const holdToken = generateHoldToken();

    const [holdResult] = await connection.query(
      `
      INSERT INTO reservation_holds (
        hold_token,
        guest_email,
        check_in_date,
        check_out_date,
        expires_at,
        status
      )
      VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 'active')
      `,
      [holdToken, guest_email || null, check_in_date, check_out_date, BOOKING_HOLD_MINUTES]
    );

    for (const roomId of normalizedRoomIds) {
      await connection.query(
        `
        INSERT INTO reservation_hold_rooms (hold_id, room_id)
        VALUES (?, ?)
        `,
        [holdResult.insertId, roomId]
      );
    }

    const [holdRows] = await connection.query(
      'SELECT hold_token, expires_at, check_in_date, check_out_date FROM reservation_holds WHERE id = ? LIMIT 1',
      [holdResult.insertId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Hold created successfully',
      ...holdRows[0],
      room_ids: normalizedRoomIds
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to create reservation hold' });
  } finally {
    connection.release();
  }
}

async function getReservationHold(req, res) {
  const token = req.params.token;

  try {
    await expireStaleHolds(pool);

    const [holds] = await pool.query(
      `
      SELECT hold_token, guest_email, check_in_date, check_out_date, expires_at, status
      FROM reservation_holds
      WHERE hold_token = ?
      LIMIT 1
      `,
      [token]
    );

    if (!holds.length) {
      return res.status(404).json({ message: 'Hold not found' });
    }

    const hold = holds[0];
    const [rooms] = await pool.query(
      `
      SELECT room_id
      FROM reservation_hold_rooms hrr
      JOIN reservation_holds rh ON rh.id = hrr.hold_id
      WHERE rh.hold_token = ?
      ORDER BY room_id ASC
      `,
      [token]
    );

    res.json({
      ...hold,
      room_ids: rooms.map((row) => row.room_id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch hold' });
  }
}

async function releaseReservationHold(req, res) {
  try {
    const [result] = await pool.query(
      `
      UPDATE reservation_holds
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE hold_token = ? AND status = 'active'
      `,
      [req.params.token]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Active hold not found' });
    }

    res.json({ message: 'Hold released successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to release hold' });
  }
}

async function getMyBookings(req, res) {
  try {
    const email = String(req.query.email || '').trim();

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.reservation_code,
        r.confirmation_code,
        r.check_in_date,
        r.check_out_date,
        r.reservation_status,
        r.payment_status,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        r.created_at
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE g.email = ?
      ORDER BY r.created_at DESC
      `,
      [email]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
}

async function cancelMyBooking(req, res) {
  const connection = await pool.getConnection();

  try {
    const { reservation_code, email, reason } = req.body;

    if (!reservation_code || !email || !reason) {
      return res.status(400).json({ message: 'reservation_code, email, and reason are required' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        r.id,
        r.reservation_code,
        r.reservation_status,
        r.check_in_date
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE r.reservation_code = ? AND g.email = ?
      LIMIT 1
      FOR UPDATE
      `,
      [reservation_code, email]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Reservation not found for this email' });
    }

    const reservation = rows[0];
    const currentStatus = reservation.reservation_status;

    if (['cancelled', 'checked_in', 'checked_out', 'no_show'].includes(currentStatus)) {
      await connection.rollback();
      return res.status(400).json({ message: `Cannot cancel a ${currentStatus} reservation` });
    }

    const hoursUntilCheckIn =
      (new Date(`${normalizeSqlDate(reservation.check_in_date)}T00:00:00`).getTime() - Date.now()) /
      (1000 * 60 * 60);

    if (hoursUntilCheckIn < CANCELLATION_MIN_HOURS) {
      await connection.rollback();
      return res.status(400).json({
        message: `Cancellations are only allowed at least ${CANCELLATION_MIN_HOURS} hours before check-in`
      });
    }

    await connection.query(
      `
      UPDATE reservations
      SET
        reservation_status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [reason, reservation.id]
    );

    await connection.query(
      `
      INSERT INTO reservation_status_history (
        reservation_id,
        old_status,
        new_status,
        notes
      )
      VALUES (?, ?, 'cancelled', ?)
      `,
      [reservation.id, currentStatus, `Guest self-service cancellation: ${reason}`]
    );

    await connection.query(
      `
      INSERT INTO cancellation_requests (
        reservation_id,
        requested_by,
        reason,
        request_status,
        reviewed_at,
        review_notes
      )
      VALUES (?, 'guest', ?, 'completed', NOW(), 'Auto-approved by policy-safe self-service cancellation')
      `,
      [reservation.id, reason]
    );

    await logActivity(connection, {
      userId: null,
      entityType: 'reservation',
      entityId: reservation.id,
      action: 'guest_cancel_booking',
      description: `Guest cancelled reservation ${reservation.reservation_code}`
    });

    await connection.commit();
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to cancel booking' });
  } finally {
    connection.release();
  }
}

async function getMyBookingReceipt(req, res) {
  try {
    const code = req.params.code;
    const email = String(req.query.email || '').trim();

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const reservation = await fetchReservationDetails(
      pool,
      'r.reservation_code = ? AND g.email = ?',
      [code, email]
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Booking not found for this email' });
    }

    const roomCharges = (reservation.rooms || []).map((room) => ({
      item: `${room.room_type_name} ${room.room_number} (${room.room_name})`,
      nights: Number(room.nights || 0),
      unit_price: Number(room.nightly_rate || 0),
      amount: Number(room.line_total || 0)
    }));

    res.json({
      issued_at: new Date().toISOString(),
      reservation: {
        reservation_code: reservation.reservation_code,
        confirmation_code: reservation.confirmation_code,
        guest_name: reservation.guest_name,
        guest_email: reservation.guest_email,
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date,
        reservation_status: reservation.reservation_status,
        payment_status: reservation.payment_status,
        total_amount: Number(reservation.total_amount || 0),
        amount_paid: Number(reservation.amount_paid || 0),
        balance_due: Number(reservation.balance_due || 0)
      },
      room_charges: roomCharges,
      payments: (reservation.payments || []).map((payment) => ({
        payment_method: payment.payment_method,
        payment_channel: payment.payment_channel,
        payment_status: payment.payment_status,
        amount: Number(payment.amount || 0),
        reference_number: payment.reference_number,
        paid_at: payment.paid_at || payment.created_at
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate receipt' });
  }
}

async function updateReservationStatus(req, res) {
  const connection = await pool.getConnection();

  try {
    const { status, notes, changed_by_user_id } = req.body;
    const effectiveChangedBy = changed_by_user_id || req.user?.id || null;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    // Validate status is a valid reservation status
    try {
      validateEnum('reservation_status', status, 'reservation_status');
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    await connection.beginTransaction();

    const [currentRows] = await connection.query(
      'SELECT reservation_status, reservation_code, confirmation_code FROM reservations WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (currentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const oldStatus = currentRows[0].reservation_status;
    const currentReservationCode = currentRows[0].reservation_code;
    const existingConfirmationCode = currentRows[0].confirmation_code;

    await connection.query(
      `
      UPDATE reservations
      SET
        reservation_status = ?,
        confirmation_code = CASE
          WHEN ? = 'confirmed' THEN COALESCE(confirmation_code, ?)
          ELSE confirmation_code
        END,
        checked_in_at = CASE WHEN ? = 'checked_in' THEN NOW() ELSE checked_in_at END,
        checked_out_at = CASE WHEN ? = 'checked_out' THEN NOW() ELSE checked_out_at END,
        cancelled_at = CASE WHEN ? = 'cancelled' THEN NOW() ELSE cancelled_at END,
        cancellation_reason = CASE WHEN ? = 'cancelled' THEN ? ELSE cancellation_reason END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        status,
        status,
        status === 'confirmed'
          ? (existingConfirmationCode || generateConfirmationCode(currentReservationCode))
          : null,
        status,
        status,
        status,
        status,
        notes || null,
        req.params.id
      ]
    );

    await connection.query(
      `
      INSERT INTO reservation_status_history (
        reservation_id,
        old_status,
        new_status,
        changed_by_user_id,
        notes
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [req.params.id, oldStatus, status, effectiveChangedBy, notes || null]
    );

    await logActivity(connection, {
      userId: effectiveChangedBy,
      entityType: 'reservation',
      entityId: Number(req.params.id),
      action: 'update_reservation_status',
      description: `Reservation status changed from ${oldStatus} to ${status}`
    });

    await connection.commit();

    res.json({ message: 'Reservation status updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to update reservation status' });
  } finally {
    connection.release();
  }
}

async function confirmReservationManually(req, res) {
  const connection = await pool.getConnection();

  try {
    const { notes } = req.body || {};
    const reservationId = Number(req.params.id);

    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT reservation_status, reservation_code, confirmation_code FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE',
      [reservationId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const current = rows[0];
    const confirmationCode = current.confirmation_code || generateConfirmationCode(current.reservation_code);

    await connection.query(
      `
      UPDATE reservations
      SET reservation_status = 'confirmed', confirmation_code = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [confirmationCode, reservationId]
    );

    await connection.query(
      `
      INSERT INTO reservation_status_history (
        reservation_id,
        old_status,
        new_status,
        changed_by_user_id,
        notes
      )
      VALUES (?, ?, 'confirmed', ?, ?)
      `,
      [reservationId, current.reservation_status, req.user?.id || null, notes || 'Manual confirmation by admin']
    );

    await logActivity(connection, {
      userId: req.user?.id || null,
      entityType: 'reservation',
      entityId: reservationId,
      action: 'manual_confirm_reservation',
      description: `Reservation manually confirmed with reference ${confirmationCode}`
    });

    await connection.commit();
    res.json({ message: 'Reservation confirmed', confirmation_code: confirmationCode });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Failed to confirm reservation' });
  } finally {
    connection.release();
  }
}

// POST endpoint for my-bookings list (uses email from body instead of query string)
async function getMyBookingsList(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required in request body' });
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return res.status(400).json({ message: 'email cannot be empty' });
    }

    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.reservation_code,
        r.confirmation_code,
        r.check_in_date,
        r.check_out_date,
        r.reservation_status,
        r.payment_status,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        r.created_at
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE g.email = ?
      ORDER BY r.created_at DESC
      `,
      [trimmedEmail]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
}

// POST endpoint for my-bookings receipt (uses email from body instead of query string)
async function getMyBookingReceiptPost(req, res) {
  try {
    const code = req.params.code;
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required in request body' });
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return res.status(400).json({ message: 'email cannot be empty' });
    }

    const reservation = await fetchReservationDetails(
      pool,
      'r.reservation_code = ? AND g.email = ?',
      [code, trimmedEmail]
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Booking not found for this email' });
    }

    const roomCharges = (reservation.rooms || []).map((room) => ({
      item: `${room.room_type_name} ${room.room_number} (${room.room_name})`,
      nights: Number(room.nights || 0),
      unit_price: Number(room.nightly_rate || 0),
      amount: Number(room.line_total || 0)
    }));

    res.json({
      issued_at: new Date().toISOString(),
      reservation: {
        reservation_code: reservation.reservation_code,
        confirmation_code: reservation.confirmation_code,
        guest_name: reservation.guest_name,
        guest_email: reservation.guest_email,
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date,
        reservation_status: reservation.reservation_status,
        payment_status: reservation.payment_status,
        total_amount: Number(reservation.total_amount || 0),
        amount_paid: Number(reservation.amount_paid || 0),
        balance_due: Number(reservation.balance_due || 0)
      },
      room_charges: roomCharges,
      payments: (reservation.payments || []).map((payment) => ({
        payment_method: payment.payment_method,
        payment_channel: payment.payment_channel,
        payment_status: payment.payment_status,
        amount: Number(payment.amount || 0),
        reference_number: payment.reference_number,
        paid_at: payment.paid_at || payment.created_at
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate receipt' });
  }
}

module.exports = {
  getReservations,
  getReservationById,
  getReservationByCode,
  createReservationHold,
  getReservationHold,
  releaseReservationHold,
  createReservation,
  updateReservationStatus,
  confirmReservationManually,
  getMyBookings,
  getMyBookingsList,
  cancelMyBooking,
  getMyBookingReceipt,
  getMyBookingReceiptPost
};

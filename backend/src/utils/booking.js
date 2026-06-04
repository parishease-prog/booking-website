function validateDateRange(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) {
    return 'check_in_date and check_out_date are required';
  }

  if (checkOutDate <= checkInDate) {
    return 'check_out_date must be later than check_in_date';
  }

  return null;
}

/**
 * Validate guest occupancy against room capacity
 * @param {number} adultCount - Number of adults
 * @param {number} childCount - Number of children
 * @param {number} baseCapacity - Room base capacity
 * @param {number} maxCapacity - Room maximum capacity
 * @returns {string|null} - Error message if invalid, null if valid
 */
function validateOccupancy(adultCount, childCount, baseCapacity, maxCapacity) {
  const totalGuests = Number(adultCount || 0) + Number(childCount || 0);
  const maxCap = Number(maxCapacity || baseCapacity || 2);

  if (totalGuests < 1) {
    return 'At least one adult is required';
  }

  if (totalGuests > maxCap) {
    return `Total guests (${totalGuests}) exceeds room maximum capacity (${maxCap})`;
  }

  return null;
}

function generateReservationCode() {
  return `RES-${Date.now()}`;
}

function generateConfirmationCode(reservationCode = '') {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const normalizedCode = String(reservationCode || 'RES').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
  return `CNF-${normalizedCode}-${suffix}`;
}

function generateHoldToken() {
  const entropy = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `HOLD-${Date.now()}-${entropy}`;
}

function calculateNights(checkInDate, checkOutDate) {
  return Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );
}

function normalizeRoomIds(roomIds) {
  if (!Array.isArray(roomIds)) {
    return [];
  }

  return roomIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function getAvailableRoomsQuery(connection, options = {}) {
  const {
    checkInDate,
    checkOutDate,
    roomIds = [],
    roomTypeId = null,
    ignoreHoldToken = null
  } = options;

  const ids = normalizeRoomIds(roomIds);
  let paramIndex = 1;
  const params = [];
  const conditions = [
    'r.is_active = true',
    "r.status = 'available'"
  ];

  if (ids.length > 0) {
    const idPlaceholders = ids.map(() => `$${paramIndex++}`).join(',');
    conditions.push(`r.id IN (${idPlaceholders})`);
    params.push(...ids);
  }

  if (roomTypeId) {
    conditions.push(`r.room_type_id = $${paramIndex++}`);
    params.push(Number(roomTypeId));
  }

  // Add date parameters to params array (they will be $N where N starts after previous params)
  const checkOutDateParam = `$${paramIndex++}`;
  const checkInDateParam = `$${paramIndex++}`;
  const blockCheckOutParam = `$${paramIndex++}`;
  const blockCheckInParam = `$${paramIndex++}`;
  const resortCheckOutParam = `$${paramIndex++}`;
  const resortCheckInParam = `$${paramIndex++}`;
  const holdCheckOutParam = `$${paramIndex++}`;
  const holdCheckInParam = `$${paramIndex++}`;
  let holdTokenParam = '';

  if (ignoreHoldToken) {
    holdTokenParam = `AND rh.hold_token <> $${paramIndex++}`;
  }

  const query = `
    SELECT
      r.*,
      rt.name AS room_type_name,
      rt.base_capacity,
      rt.max_capacity,
      COALESCE(r.price_override, rt.base_price) AS effective_price
    FROM rooms r
    JOIN room_types rt ON rt.id = r.room_type_id
    WHERE ${conditions.join('\n      AND ')}
      AND r.id NOT IN (
        SELECT rr.room_id
        FROM reservation_rooms rr
        JOIN reservations res ON rr.reservation_id = res.id
        WHERE res.reservation_status IN ('pending', 'confirmed', 'checked_in', 'overstayed')
          AND rr.check_in_date < ${checkOutDateParam}
          AND rr.check_out_date > ${checkInDateParam}
      )
      AND r.id NOT IN (
        SELECT ab.room_id
        FROM availability_blocks ab
        WHERE ab.block_scope = 'room'
          AND ab.status = 'active'
          AND ab.start_date < ${blockCheckOutParam}
          AND ab.end_date > ${blockCheckInParam}
          AND ab.room_id IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM availability_blocks ab2
        WHERE ab2.block_scope = 'whole_resort'
          AND ab2.status = 'active'
          AND ab2.start_date < ${resortCheckOutParam}
          AND ab2.end_date > ${resortCheckInParam}
      )
      AND r.id NOT IN (
        SELECT hrr.room_id
        FROM reservation_hold_rooms hrr
        JOIN reservation_holds rh ON rh.id = hrr.hold_id
        WHERE rh.status = 'active'
          AND rh.expires_at > NOW()
          AND rh.check_in_date < ${holdCheckOutParam}
          AND rh.check_out_date > ${holdCheckInParam}
          ${holdTokenParam}
      )
    ORDER BY r.room_number ASC
  `;

  params.push(
    checkOutDate,
    checkInDate,
    checkOutDate,
    checkInDate,
    checkOutDate,
    checkInDate,
    checkOutDate,
    checkInDate
  );

  if (ignoreHoldToken) {
    params.push(ignoreHoldToken);
  }

  const result = await connection.query(query, params);
  return result.rows;
}

async function expireStaleHolds(connection) {
  await connection.query(
    `
    UPDATE reservation_holds
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' AND expires_at <= NOW()
    `
  );
}

async function fetchReservationDetails(connection, whereClause, params) {
  const query = `
    SELECT
      r.*,
      CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
      g.email AS guest_email,
      g.phone AS guest_phone
    FROM reservations r
    JOIN guests g ON g.id = r.guest_id
    WHERE ${whereClause}
    LIMIT 1
  `;

  const result = await connection.query(query, params);
  const reservations = result.rows;

  if (reservations.length === 0) {
    return null;
  }

  const reservation = reservations[0];

  const roomsResult = await connection.query(
    `
    SELECT
      rr.*,
      rm.room_number,
      rm.room_name,
      rt.name AS room_type_name
    FROM reservation_rooms rr
    JOIN rooms rm ON rm.id = rr.room_id
    JOIN room_types rt ON rt.id = rm.room_type_id
    WHERE rr.reservation_id = $1
    ORDER BY rm.room_number ASC
    `,
    [reservation.id]
  );
  const rooms = roomsResult.rows;

  const paymentsResult = await connection.query(
    `
    SELECT *
    FROM payments
    WHERE reservation_id = $1
    ORDER BY created_at DESC
    `,
    [reservation.id]
  );
  const payments = paymentsResult.rows;

  return {
    ...reservation,
    rooms,
    payments
  };
}

async function updateReservationPaymentSummary(connection, reservationId) {
  const paymentTotalsResult = await connection.query(
    `
    SELECT COALESCE(SUM(
      CASE
        WHEN payment_status IN ('paid', 'partial') THEN amount
        WHEN payment_status = 'refunded' THEN -amount
        ELSE 0
      END
    ), 0) AS amount_paid
    FROM payments
    WHERE reservation_id = $1
    `,
    [reservationId]
  );

  const paymentTotals = paymentTotalsResult.rows;
  const amountPaid = Number(paymentTotals[0].amount_paid || 0);

  const reservationResult = await connection.query(
    'SELECT total_amount, reservation_status, reservation_code, confirmation_code FROM reservations WHERE id = $1 LIMIT 1',
    [reservationId]
  );

  const reservationRows = reservationResult.rows;

  if (reservationRows.length === 0) {
    return;
  }

  const reservation = reservationRows[0];
  const totalAmount = Number(reservation.total_amount || 0);
  const balanceDue = Math.max(totalAmount - amountPaid, 0);

  let paymentStatus = 'pending';
  if (amountPaid <= 0) {
    paymentStatus = 'pending';
  } else if (amountPaid < totalAmount) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'paid';
  }

  const shouldAutoConfirm =
    paymentStatus === 'paid' &&
    reservation.reservation_status === 'pending';

  const nextReservationStatus = shouldAutoConfirm
    ? 'confirmed'
    : reservation.reservation_status;

  const confirmationCode = reservation.confirmation_code ||
    (shouldAutoConfirm ? generateConfirmationCode(reservation.reservation_code) : null);

  await connection.query(
    `
    UPDATE reservations
    SET
      amount_paid = $1,
      balance_due = $2,
      payment_status = $3,
      reservation_status = $4,
      confirmation_code = COALESCE(confirmation_code, $5),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    `,
    [amountPaid, balanceDue, paymentStatus, nextReservationStatus, confirmationCode, reservationId]
  );
}

module.exports = {
  validateDateRange,
  validateOccupancy,
  generateReservationCode,
  generateConfirmationCode,
  generateHoldToken,
  calculateNights,
  normalizeRoomIds,
  getAvailableRoomsQuery,
  expireStaleHolds,
  fetchReservationDetails,
  updateReservationPaymentSummary
};

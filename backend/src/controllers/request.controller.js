const pool = require('../config/db');
const { validateText } = require('../utils/validation');
const { validateEnum } = require('../utils/enums');

async function getCancellationRequests(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT cr.*, r.reservation_code
      FROM cancellation_requests cr
      JOIN reservations r ON r.id = cr.reservation_id
      ORDER BY cr.requested_at DESC
      `
    );
    const rows = result.rows;
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch cancellation requests' });
  }
}

async function createCancellationRequest(req, res) {
  try {
    const { reservation_id, requested_by = 'guest', reason } = req.body;

    if (!reservation_id || !reason) {
      return res.status(400).json({ message: 'reservation_id and reason are required' });
    }

    // Validate reason length (max 500 chars)
    if (!validateText(reason, 500)) {
      return res.status(400).json({ message: 'Reason must be 1-500 characters' });
    }

    const result = await pool.query(
      `
      INSERT INTO cancellation_requests (
        reservation_id,
        requested_by,
        reason,
        request_status
      )
      VALUES ($1, $2, $3, 'pending')
      RETURNING id
      `,
      [reservation_id, requested_by, reason.trim()]
    );
    const request_id = result.rows[0].id;

    res.status(201).json({
      message: 'Cancellation request created successfully',
      request_id: request_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create cancellation request' });
  }
}

async function getRefundRequests(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT rr.*, r.reservation_code
      FROM refund_requests rr
      JOIN reservations r ON r.id = rr.reservation_id
      ORDER BY rr.requested_at DESC
      `
    );
    const rows = result.rows;
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch refund requests' });
  }
}

async function createRefundRequest(req, res) {
  try {
    const {
      reservation_id,
      payment_id,
      reason,
      requested_amount
    } = req.body;

    if (!reservation_id || !reason || requested_amount == null) {
      return res.status(400).json({
        message: 'reservation_id, reason, and requested_amount are required'
      });
    }

    // Validate reason length (max 500 chars)
    if (!validateText(reason, 500)) {
      return res.status(400).json({ message: 'Reason must be 1-500 characters' });
    }

    // Fetch the reservation to validate the requested amount
    const reservations_result = await pool.query(
      'SELECT total_amount FROM reservations WHERE id = $1',
      [reservation_id]
    );
    const reservations = reservations_result.rows;

    if (reservations.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const reservation = reservations[0];
    const reservationTotal = Number(reservation.total_amount);
    const requestedAmount = Number(requested_amount);

    // Validate that requested amount matches the reservation total
    if (requestedAmount !== reservationTotal) {
      return res.status(400).json({
        message: `Refund amount must match the reservation total of ${reservationTotal}`
      });
    }

    const result = await pool.query(
      `
      INSERT INTO refund_requests (
        reservation_id,
        payment_id,
        reason,
        request_status,
        requested_amount
      )
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING id
      `,
      [reservation_id, payment_id || null, reason.trim(), requested_amount]
    );
    const refund_id = result.rows[0].id;

    res.status(201).json({
      message: 'Refund request created successfully',
      request_id: refund_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create refund request' });
  }
}

async function getStayExtensions(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT se.*, r.reservation_code
      FROM stay_extensions se
      JOIN reservations r ON r.id = se.reservation_id
      ORDER BY se.requested_at DESC
      `
    );
    const rows = result.rows;
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch stay extensions' });
  }
}

async function createStayExtension(req, res) {
  try {
    const {
      reservation_id,
      current_check_out_date,
      requested_check_out_date,
      reason
    } = req.body;

    if (
      !reservation_id ||
      !current_check_out_date ||
      !requested_check_out_date
    ) {
      return res.status(400).json({
        message: 'reservation_id, current_check_out_date, and requested_check_out_date are required'
      });
    }

    // Fetch the first reservation_room_id for this reservation
    const reservationRooms_result = await pool.query(
      'SELECT id FROM reservation_rooms WHERE reservation_id = $1 LIMIT 1',
      [reservation_id]
    );
    const reservationRooms = reservationRooms_result.rows;

    if (reservationRooms.length === 0) {
      return res.status(404).json({ message: 'No rooms found for this reservation' });
    }

    const reservation_room_id = reservationRooms[0].id;

    const result = await pool.query(
      `
      INSERT INTO stay_extensions (
        reservation_id,
        reservation_room_id,
        current_check_out_date,
        requested_check_out_date,
        status,
        additional_amount,
        reason
      )
      VALUES ($1, $2, $3, $4, 'pending', 0, $5)
      RETURNING id
      `,
      [
        reservation_id,
        reservation_room_id,
        current_check_out_date,
        requested_check_out_date,
        reason || null
      ]
    );
    const extension_id = result.rows[0].id;

    res.status(201).json({
      message: 'Stay extension request created successfully',
      extension_id: extension_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create stay extension request' });
  }
}

async function getRoomTransfers(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        rt.*,
        r.reservation_code,
        rf.room_number AS from_room_number,
        rt2.room_number AS to_room_number
      FROM room_transfers rt
      JOIN reservations r ON r.id = rt.reservation_id
      JOIN rooms rf ON rf.id = rt.from_room_id
      JOIN rooms rt2 ON rt2.id = rt.to_room_id
      ORDER BY rt.created_at DESC
      `
    );
    const rows = result.rows;
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch room transfers' });
  }
}

async function createRoomTransfer(req, res) {
  try {
    const {
      reservation_id,
      to_room_id,
      reason,
      effective_date,
      processed_by_user_id,
      notes
    } = req.body;

    if (
      !reservation_id ||
      !to_room_id ||
      !reason ||
      !effective_date
    ) {
      return res.status(400).json({
        message: 'reservation_id, to_room_id, reason, and effective_date are required'
      });
    }

    // Fetch the first reservation_room_id and from_room_id for this reservation
    const reservationRooms_result = await pool.query(
      `SELECT id, room_id FROM reservation_rooms WHERE reservation_id = $1 LIMIT 1`,
      [reservation_id]
    );
    const reservationRooms = reservationRooms_result.rows;

    if (reservationRooms.length === 0) {
      return res.status(404).json({ message: 'No rooms found for this reservation' });
    }

    const reservation_room_id = reservationRooms[0].id;
    const from_room_id = reservationRooms[0].room_id;

    const result = await pool.query(
      `
      INSERT INTO room_transfers (
        reservation_id,
        reservation_room_id,
        from_room_id,
        to_room_id,
        reason,
        transfer_status,
        effective_date,
        additional_amount,
        processed_by_user_id,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, 0, $7, $8)
      RETURNING id
      `,
      [
        reservation_id,
        reservation_room_id,
        from_room_id,
        to_room_id,
        reason,
        effective_date,
        processed_by_user_id || null,
        notes || null
      ]
    );
    const transfer_id = result.rows[0].id;

    res.status(201).json({
      message: 'Room transfer request created successfully',
      transfer_id: transfer_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create room transfer request' });
  }
}

async function updateCancellationRequest(req, res) {
  try {
    const { id } = req.params;
    const { request_status, review_notes } = req.body;

    if (!request_status) {
      return res.status(400).json({ message: 'request_status is required' });
    }

    // Validate status is valid for cancellation request
    try {
      validateEnum('cancellation_request_status', request_status, 'request_status');
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    await pool.query(
      `
      UPDATE cancellation_requests
      SET request_status = $1, review_notes = $2
      WHERE id = $3
      `,
      [request_status, review_notes || null, id]
    );

    res.json({ message: 'Cancellation request updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update cancellation request' });
  }
}

async function deleteCancellationRequest(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cancellation_requests WHERE id = $1', [id]);
    res.json({ message: 'Cancellation request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete cancellation request' });
  }
}

async function updateRefundRequest(req, res) {
  try {
    const { id } = req.params;
    const { request_status, response_notes } = req.body;

    console.log('updateRefundRequest called:', { id, request_status, response_notes });

    if (!request_status) {
      console.log('Missing request_status');
      return res.status(400).json({ message: 'request_status is required' });
    }

    // Validate status is valid for refund request
    try {
      validateEnum('refund_request_status', request_status, 'request_status');
      console.log('Status validation passed');
    } catch (error) {
      console.log('Status validation failed:', error.message);
      return res.status(400).json({ message: error.message });
    }

    const updateResult = await pool.query(
      `
      UPDATE refund_requests
      SET request_status = $1, review_notes = $2
      WHERE id = $3
      `,
      [request_status, response_notes || null, id]
    );

    console.log('Update result:', updateResult);

    res.json({ message: 'Refund request updated successfully' });
  } catch (error) {
    console.error('Error in updateRefundRequest:', error);
    res.status(500).json({ message: 'Failed to update refund request' });
  }
}

async function deleteRefundRequest(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM refund_requests WHERE id = $1', [id]);
    res.json({ message: 'Refund request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete refund request' });
  }
}

async function updateStayExtension(req, res) {
  try {
    const { id } = req.params;
    const { status, response_notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    await pool.query(
      `
      UPDATE stay_extensions
      SET status = $1, notes = $2
      WHERE id = $3
      `,
      [status, response_notes || null, id]
    );

    res.json({ message: 'Stay extension updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update stay extension' });
  }
}

async function deleteStayExtension(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM stay_extensions WHERE id = $1', [id]);
    res.json({ message: 'Stay extension deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete stay extension' });
  }
}

async function updateRoomTransfer(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    await pool.query(
      `
      UPDATE room_transfers
      SET transfer_status = $1, notes = $2
      WHERE id = $3
      `,
      [status, notes || null, id]
    );

    res.json({ message: 'Room transfer updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update room transfer' });
  }
}

async function deleteRoomTransfer(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM room_transfers WHERE id = $1', [id]);
    res.json({ message: 'Room transfer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete room transfer' });
  }
}

module.exports = {
  getCancellationRequests,
  createCancellationRequest,
  updateCancellationRequest,
  deleteCancellationRequest,
  getRefundRequests,
  createRefundRequest,
  updateRefundRequest,
  deleteRefundRequest,
  getStayExtensions,
  createStayExtension,
  updateStayExtension,
  deleteStayExtension,
  getRoomTransfers,
  createRoomTransfer,
  updateRoomTransfer,
  deleteRoomTransfer
};

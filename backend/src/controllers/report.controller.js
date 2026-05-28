const pool = require('../config/db');

/**
 * Generate reservations report
 */
async function getReservationsReport(req, res) {
  try {
    const { startDate, endDate, status } = req.query;

    let query = `
      SELECT 
        r.id,
        r.reservation_code,
        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
        g.email as guest_email,
        r.check_in_date,
        r.check_out_date,
        r.reservation_status,
        r.payment_status,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        r.created_at,
        COUNT(DISTINCT rr.id) as room_count,
        GROUP_CONCAT(DISTINCT rt.name ORDER BY rt.name SEPARATOR ', ') as room_type_names,
        GROUP_CONCAT(DISTINCT rm.room_number ORDER BY rm.room_number SEPARATOR ', ') as room_numbers
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
      LEFT JOIN rooms rm ON rr.room_id = rm.id
      LEFT JOIN room_types rt ON rm.room_type_id = rt.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ' AND r.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(endDate);
    }

    if (status) {
      query += ' AND r.reservation_status = ?';
      params.push(status);
    }

    query += `
      GROUP BY
        r.id,
        r.reservation_code,
        g.first_name,
        g.last_name,
        g.email,
        r.check_in_date,
        r.check_out_date,
        r.reservation_status,
        r.payment_status,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        r.created_at
      ORDER BY r.created_at DESC
    `;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error generating reservations report:', error);
    res.status(500).json({ message: 'Failed to generate reservations report' });
  }
}

/**
 * Generate payments report
 */
async function getPaymentsReport(req, res) {
  try {
    const { startDate, endDate, status } = req.query;

    let query = `
      SELECT 
        p.id,
        p.reservation_id,
        r.reservation_code,
        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
        g.email as guest_email,
        p.amount,
        p.payment_status,
        p.payment_method,
        p.paid_at,
        p.created_at,
        r.total_amount,
        r.balance_due
      FROM payments p
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ' AND p.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND p.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(endDate);
    }

    if (status) {
      query += ' AND p.payment_status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.query(query, params);
    
    // Calculate totals
    const summary = {
      totalPayments: rows.length,
      totalAmount: rows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      byStatus: {}
    };

    rows.forEach(p => {
      if (!summary.byStatus[p.payment_status]) {
        summary.byStatus[p.payment_status] = 0;
      }
      summary.byStatus[p.payment_status] += Number(p.amount) || 0;
    });

    res.json({ data: rows, summary });
  } catch (error) {
    console.error('Error generating payments report:', error);
    res.status(500).json({ message: 'Failed to generate payments report' });
  }
}

/**
 * Generate revenue report
 */
async function getRevenueReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        DATE(p.created_at) as date,
        COUNT(DISTINCT p.reservation_id) as transaction_count,
        SUM(p.amount) as daily_revenue,
        COUNT(CASE WHEN p.payment_status = 'paid' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN p.payment_status = 'failed' THEN 1 END) as failed_payments
      FROM payments p
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ' AND p.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND p.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(endDate);
    }

    query += ' GROUP BY DATE(p.created_at) ORDER BY date DESC';

    const [rows] = await pool.query(query, params);

    // Calculate summary
    const summary = {
      totalRevenue: rows.reduce((sum, r) => sum + (Number(r.daily_revenue) || 0), 0),
      totalTransactions: rows.reduce((sum, r) => sum + (Number(r.transaction_count) || 0), 0),
      totalSuccessful: rows.reduce((sum, r) => sum + (Number(r.successful_payments) || 0), 0),
      totalFailed: rows.reduce((sum, r) => sum + (Number(r.failed_payments) || 0), 0),
      average: 0
    };

    if (rows.length > 0) {
      summary.average = summary.totalRevenue / rows.length;
    }

    res.json({ data: rows, summary });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ message: 'Failed to generate revenue report' });
  }
}

/**
 * Generate occupancy report
 */
async function getOccupancyReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const params = [];
    let reservationRoomsJoin = 'LEFT JOIN reservation_rooms rr ON rm.id = rr.room_id';

    if (startDate) {
      reservationRoomsJoin += ' AND rr.check_in_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      reservationRoomsJoin += ' AND rr.check_out_date <= ?';
      params.push(endDate);
    }

    let query = `
      SELECT 
        rm.room_number,
        rm.room_name,
        rt.name as room_type_name,
        COUNT(DISTINCT rr.id) as total_reservations,
        COALESCE(SUM(DATEDIFF(rr.check_out_date, rr.check_in_date)), 0) as total_nights,
        COUNT(DISTINCT CASE WHEN r.reservation_status = 'checked_out' THEN rr.id END) as completed_stays,
        COUNT(DISTINCT CASE WHEN r.reservation_status = 'cancelled' THEN rr.id END) as cancelled_stays
      FROM rooms rm
      LEFT JOIN room_types rt ON rm.room_type_id = rt.id
      ${reservationRoomsJoin}
      LEFT JOIN reservations r ON rr.reservation_id = r.id
    `;

    query += `
      GROUP BY
        rm.id,
        rm.room_number,
        rm.room_name,
        rt.id,
        rt.name
      ORDER BY rm.room_number ASC
    `;

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    res.status(500).json({ message: 'Failed to generate occupancy report' });
  }
}

/**
 * Generate cancellations report
 */
async function getCancellationsReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        cr.id as cancellation_request_id,
        r.id as reservation_id,
        r.reservation_code,
        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
        g.email as guest_email,
        r.check_in_date,
        r.check_out_date,
        r.total_amount,
        r.refund_amount,
        r.cancelled_at,
        r.cancellation_reason,
        cr.reason,
        cr.requested_by,
        cr.request_status,
        cr.requested_at,
        u.email as reviewed_by_email,
        cr.reviewed_at,
        cr.review_notes
      FROM cancellation_requests cr
      LEFT JOIN reservations r ON cr.reservation_id = r.id
      LEFT JOIN guests g ON r.guest_id = g.id
      LEFT JOIN users u ON cr.reviewed_by_user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ' AND cr.requested_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND cr.requested_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(endDate);
    }

    query += ' ORDER BY cr.requested_at DESC';

    const [rows] = await pool.query(query, params);

    // Calculate summary
    const summary = {
      totalCancellations: rows.length,
      totalRefunded: rows.reduce((sum, c) => sum + (Number(c.refund_amount) || 0), 0),
      byStatus: {}
    };

    rows.forEach(c => {
      if (!summary.byStatus[c.request_status]) {
        summary.byStatus[c.request_status] = 0;
      }
      summary.byStatus[c.request_status] += 1;
    });

    res.json({ data: rows, summary });
  } catch (error) {
    console.error('Error generating cancellations report:', error);
    res.status(500).json({ message: 'Failed to generate cancellations report' });
  }
}

/**
 * Generate activity logs report
 */
async function getActivityLogsReport(req, res) {
  try {
    const { startDate, endDate, entityType, action } = req.query;

    let query = `
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.description,
        al.created_at,
        u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND al.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(endDate);
    }

    if (entityType) {
      query += ' AND al.entity_type = ?';
      params.push(entityType);
    }

    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    query += ' ORDER BY al.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error generating activity logs report:', error);
    res.status(500).json({ message: 'Failed to generate activity logs report' });
  }
}

module.exports = {
  getReservationsReport,
  getPaymentsReport,
  getRevenueReport,
  getOccupancyReport,
  getCancellationsReport,
  getActivityLogsReport
};

const pool = require('../config/db');

function startOfDay(value) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getOperationsOverview(req, res) {
  try {
    const from = req.query.from || startOfDay(new Date());
    const to = req.query.to || addDays(from, 14);

    const reservationsResult = await pool.query(
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
        r.balance_due,
        g.first_name || ' ' || g.last_name AS guest_name,
        g.email AS guest_email
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE r.check_in_date <= $1
        AND r.check_out_date >= $2
      ORDER BY r.check_in_date ASC, r.created_at DESC
      `,
      [to, from]
    );
    const reservations = reservationsResult.rows;

    const statusSummaryResult = await pool.query(
      `
      SELECT reservation_status, COUNT(*) AS total
      FROM reservations
      GROUP BY reservation_status
      ORDER BY total DESC
      `
    );
    const statusSummary = statusSummaryResult.rows;

    const paymentSummaryResult = await pool.query(
      `
      SELECT payment_status, COUNT(*) AS total
      FROM reservations
      GROUP BY payment_status
      ORDER BY total DESC
      `
    );
    const paymentSummary = paymentSummaryResult.rows;

    const dailyLoadResult = await pool.query(
      `
      SELECT
        check_in_date,
        COUNT(*) AS arrivals,
        SUM(CASE WHEN reservation_status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) AS active_reservations
      FROM reservations
      WHERE check_in_date BETWEEN $1 AND $2
      GROUP BY check_in_date
      ORDER BY check_in_date ASC
      `,
      [from, to]
    );
    const dailyLoad = dailyLoadResult.rows;

    res.json({
      window: { from, to },
      reservations,
      status_summary: statusSummary,
      payment_summary: paymentSummary,
      daily_load: dailyLoad
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch operations overview' });
  }
}

async function getActivityLogs(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const entityType = req.query.entity_type || null;
    const params = [];
    const filters = [];
    let paramCounter = 1;

    if (entityType) {
      filters.push(`al.entity_type = $${paramCounter++}`);
      params.push(entityType);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    params.push(limit);

    const result = await pool.query(
      `
      SELECT
        al.*,
        u.full_name AS user_name
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramCounter}
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
}

module.exports = {
  getOperationsOverview,
  getActivityLogs
};

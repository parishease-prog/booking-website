const express = require('express');
const {
  getReservationsReport,
  getPaymentsReport,
  getRevenueReport,
  getOccupancyReport,
  getCancellationsReport,
  getActivityLogsReport
} = require('../controllers/report.controller');
const {
  authenticateAdmin,
  requireAdminRole
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/admin/reports/reservations', authenticateAdmin, requireAdminRole, getReservationsReport);
router.get('/admin/reports/payments', authenticateAdmin, requireAdminRole, getPaymentsReport);
router.get('/admin/reports/revenue', authenticateAdmin, requireAdminRole, getRevenueReport);
router.get('/admin/reports/occupancy', authenticateAdmin, requireAdminRole, getOccupancyReport);
router.get('/admin/reports/cancellations', authenticateAdmin, requireAdminRole, getCancellationsReport);
router.get('/admin/reports/activity-logs', authenticateAdmin, requireAdminRole, getActivityLogsReport);

module.exports = router;

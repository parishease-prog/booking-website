const express = require('express');
const {
  getReservations,
  getReservationById,
  getReservationByCode,
  createReservation,
  updateReservationStatus,
  createReservationHold,
  getReservationHold,
  releaseReservationHold,
  confirmReservationManually,
  getMyBookings,
  getMyBookingsList,
  cancelMyBooking,
  getMyBookingReceipt,
  getMyBookingReceiptPost
} = require('../controllers/reservation.controller');
const {
  authenticateAdmin,
  requireAdminRole
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/admin/reservations', authenticateAdmin, requireAdminRole, getReservations);
router.get('/admin/reservations/code/:code', authenticateAdmin, requireAdminRole, getReservationByCode);
router.get('/admin/reservations/:id', authenticateAdmin, requireAdminRole, getReservationById);
router.patch('/admin/reservations/:id/status', authenticateAdmin, requireAdminRole, updateReservationStatus);
router.post('/admin/reservations/:id/confirm', authenticateAdmin, requireAdminRole, confirmReservationManually);
router.post('/reservation-holds', createReservationHold);
router.get('/reservation-holds/:token', getReservationHold);
router.delete('/reservation-holds/:token', releaseReservationHold);
router.get('/my-bookings', getMyBookings);
router.post('/my-bookings/list', getMyBookingsList);
router.post('/my-bookings/cancel', cancelMyBooking);
router.get('/my-bookings/:code/receipt', getMyBookingReceipt);
router.post('/my-bookings/:code/receipt', getMyBookingReceiptPost);
router.get('/reservations/code/:code', getReservationByCode);
router.get('/reservations/:id', getReservationById);
router.get('/reservations', getReservations);
router.post('/reservations', createReservation);
router.patch('/reservations/:id/status', updateReservationStatus);

module.exports = router;

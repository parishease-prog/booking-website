const express = require('express');
const {
  getPayments,
  getAdminPayments,
  createPayment,
  createAdminPayment,
  handlePaymentWebhook,
  approveAdminPayment,
  declineAdminPayment,
  refundAdminPayment
} = require('../controllers/payment.controller');
const {
  authenticateAdmin,
  requireAdminRole
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/admin/payments', authenticateAdmin, requireAdminRole, getAdminPayments);
router.post('/admin/payments', authenticateAdmin, requireAdminRole, createAdminPayment);
router.post('/admin/payments/:id/approve', authenticateAdmin, requireAdminRole, approveAdminPayment);
router.post('/admin/payments/:id/decline', authenticateAdmin, requireAdminRole, declineAdminPayment);
router.post('/admin/payments/:id/refund', authenticateAdmin, requireAdminRole, refundAdminPayment);
router.post('/payments/webhooks/generic', handlePaymentWebhook);
router.get('/payments', authenticateAdmin, requireAdminRole, getPayments);
// Guest-facing payment submission (records a pending payment; verification happens in admin workflows)
// Keep a dedicated route to avoid any ambiguity with admin-only endpoints in older deployments.
router.post('/payments/guest', createPayment);
router.post('/payments', createPayment);

module.exports = router;

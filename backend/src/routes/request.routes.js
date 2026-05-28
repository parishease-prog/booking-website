const express = require('express');
const {
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
  deleteStayExtension
} = require('../controllers/request.controller');
const { authenticateAdmin, requireAdminRole } = require('../middlewares/auth.middleware');

const router = express.Router();

// Cancellation requests
router.get('/cancellation-requests', authenticateAdmin, requireAdminRole, getCancellationRequests);
router.post('/cancellation-requests', createCancellationRequest);
router.patch('/cancellation-requests/:id', authenticateAdmin, requireAdminRole, updateCancellationRequest);
router.delete('/cancellation-requests/:id', authenticateAdmin, requireAdminRole, deleteCancellationRequest);

// Refund requests
router.get('/refund-requests', authenticateAdmin, requireAdminRole, getRefundRequests);
router.post('/refund-requests', createRefundRequest);
router.patch('/refund-requests/:id', authenticateAdmin, requireAdminRole, updateRefundRequest);
router.delete('/refund-requests/:id', authenticateAdmin, requireAdminRole, deleteRefundRequest);

// Stay extensions
router.get('/stay-extensions', authenticateAdmin, requireAdminRole, getStayExtensions);
router.post('/stay-extensions', createStayExtension);
router.patch('/stay-extensions/:id', authenticateAdmin, requireAdminRole, updateStayExtension);
router.delete('/stay-extensions/:id', authenticateAdmin, requireAdminRole, deleteStayExtension);

module.exports = router;

const express = require('express');
const {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getInquiriesByEmail
} = require('../controllers/inquiry.controller');
const { authenticateAdmin, requireAdminRole } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes (no authentication required)
// These must come before admin routes to be matched first
router.get('/lookup/by-email', getInquiriesByEmail);
router.post('/', createInquiry);

// Admin routes (require authentication)
router.get('/', authenticateAdmin, requireAdminRole, getInquiries);
router.get('/:id', authenticateAdmin, requireAdminRole, getInquiry);
router.patch('/:id', authenticateAdmin, requireAdminRole, updateInquiry);
router.delete('/:id', authenticateAdmin, requireAdminRole, deleteInquiry);

module.exports = router;

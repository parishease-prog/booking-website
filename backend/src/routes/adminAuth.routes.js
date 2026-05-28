const express = require('express');
const {
  loginAdmin,
  getCurrentAdmin
} = require('../controllers/adminAuth.controller');
const {
  authenticateAdmin,
  requireAdminRole
} = require('../middlewares/auth.middleware');
const { loginLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.post('/admin/auth/login', loginLimiter, loginAdmin);
router.get('/admin/auth/me', authenticateAdmin, requireAdminRole, getCurrentAdmin);

module.exports = router;

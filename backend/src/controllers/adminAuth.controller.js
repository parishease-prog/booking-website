const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth.middleware');
const { validateEmail, validatePassword } = require('../utils/validation');
const { recordFailedAttempt, isAccountLocked, getRemainingLockoutTime, clearFailedAttempts } = require('../middlewares/accountLockout.middleware');

function sanitizeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role
  };
}

async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if account is locked
    if (isAccountLocked(email)) {
      const remainingSeconds = getRemainingLockoutTime(email);
      return res.status(429).json({
        message: `Account is temporarily locked. Try again in ${remainingSeconds} seconds.`,
        locked: true,
        lockedUntilSeconds: remainingSeconds
      });
    }

    const result = await pool.query(
      `
      SELECT id, full_name, email, password_hash, role, is_active
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (!result.rows.length) {
      recordFailedAttempt(email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      recordFailedAttempt(email);
      return res.status(403).json({ message: 'This account is inactive' });
    }

    if (user.role !== 'admin') {
      recordFailedAttempt(email);
      return res.status(403).json({ message: 'Only admin accounts can access this area' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      recordFailedAttempt(email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(email);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to log in' });
  }
}

async function getCurrentAdmin(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT id, full_name, email, role
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    res.json({ user: sanitizeUser(result.rows[0]) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load account details' });
  }
}

module.exports = {
  loginAdmin,
  getCurrentAdmin
};

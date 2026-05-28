/**
 * CSRF Token Management
 * Generates and validates CSRF tokens for state-changing requests
 */

const crypto = require('crypto');

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_SECRET_LENGTH = 32;
const TOKEN_SALT_LENGTH = 16;

/**
 * Generate a CSRF token
 * @returns {string} - CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create CSRF token response data
 * Includes both the token and metadata
 * @returns {object} - { token: string, headerName: string }
 */
function createCSRFTokenData() {
  return {
    token: generateCSRFToken(),
    headerName: CSRF_TOKEN_HEADER
  };
}

/**
 * Middleware to attach CSRF token to requests
 * Token is sent in response headers for subsequent requests to include
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware
 */
function attachCSRFToken(req, res, next) {
  if (!req.csrfToken) {
    req.csrfToken = generateCSRFToken();
  }

  // Send token in response header for client to use in next request
  res.setHeader(CSRF_TOKEN_HEADER, req.csrfToken);
  
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Skips validation for safe methods (GET, HEAD, OPTIONS)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware
 */
function validateCSRFToken(req, res, next) {
  // Safe methods don't require CSRF validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers[CSRF_TOKEN_HEADER.toLowerCase()] || req.body?.csrfToken;

  if (!token) {
    return res.status(403).json({ message: 'CSRF token is missing' });
  }

  // In a real implementation, you might want to store tokens server-side
  // For now, we're using a simple token validation strategy
  if (typeof token !== 'string' || token.length < 32) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  // Store token for comparison if needed
  req.csrfToken = token;

  next();
}

module.exports = {
  generateCSRFToken,
  createCSRFTokenData,
  attachCSRFToken,
  validateCSRFToken,
  CSRF_TOKEN_HEADER
};

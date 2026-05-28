/**
 * Rate limiting middleware for API security
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts
 * - 5 attempts per 15 minutes per IP address
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts from this IP address, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development (optional)
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * Rate limiter for API endpoints (general)
 * - 100 requests per 15 minutes per IP address
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP address, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for sensitive operations
 * - 10 requests per 15 minutes per IP address
 */
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  apiLimiter,
  sensitiveLimiter
};

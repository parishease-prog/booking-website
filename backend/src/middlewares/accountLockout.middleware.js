/**
 * Account Lockout Mechanism
 * Tracks failed login attempts and locks accounts after 5 failures for 30 minutes
 */

const failedAttempts = new Map(); // Map<email, { count: number, lockedUntil: timestamp }>
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Record a failed login attempt
 * @param {string} email - Email address of the account
 */
function recordFailedAttempt(email) {
  const now = Date.now();
  
  if (!failedAttempts.has(email)) {
    failedAttempts.set(email, { count: 1, lockedUntil: null });
    return;
  }

  const attempt = failedAttempts.get(email);
  
  // If lock period has expired, reset counter
  if (attempt.lockedUntil && now > attempt.lockedUntil) {
    failedAttempts.set(email, { count: 1, lockedUntil: null });
    return;
  }

  attempt.count += 1;
  
  // Lock account after MAX_ATTEMPTS failures
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  
  failedAttempts.set(email, attempt);
}

/**
 * Check if an account is currently locked
 * @param {string} email - Email address of the account
 * @returns {boolean}
 */
function isAccountLocked(email) {
  if (!failedAttempts.has(email)) {
    return false;
  }

  const attempt = failedAttempts.get(email);
  const now = Date.now();

  if (!attempt.lockedUntil) {
    return false;
  }

  // Lock period has expired
  if (now > attempt.lockedUntil) {
    failedAttempts.delete(email);
    return false;
  }

  return true;
}

/**
 * Get remaining lockout time in seconds
 * @param {string} email - Email address of the account
 * @returns {number} - Seconds until account is unlocked (0 if not locked)
 */
function getRemainingLockoutTime(email) {
  if (!failedAttempts.has(email)) {
    return 0;
  }

  const attempt = failedAttempts.get(email);
  
  if (!attempt.lockedUntil) {
    return 0;
  }

  const now = Date.now();
  const remaining = attempt.lockedUntil - now;

  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clear failed attempts for an account (after successful login)
 * @param {string} email - Email address of the account
 */
function clearFailedAttempts(email) {
  failedAttempts.delete(email);
}

module.exports = {
  recordFailedAttempt,
  isAccountLocked,
  getRemainingLockoutTime,
  clearFailedAttempts
};

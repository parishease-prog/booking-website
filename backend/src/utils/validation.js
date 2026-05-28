/**
 * Input validation utilities for secure data handling
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+\d{1,3})?[\d\s\-()]{10,20}$/;
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number format (supports international)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and trim text with max length
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string|null}
 */
function validateText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

/**
 * Validate description with max length (typically 500 chars)
 * @param {string} description - Description to validate
 * @returns {string|null}
 */
function validateDescription(description) {
  return validateText(description, 500);
}

/**
 * Validate reason text with max length (typically 500 chars)
 * @param {string} reason - Reason to validate
 * @returns {string|null}
 */
function validateReason(reason) {
  return validateText(reason, 500);
}

/**
 * Validate message with max length (typically 2000 chars)
 * @param {string} message - Message to validate
 * @returns {string|null}
 */
function validateMessage(message) {
  return validateText(message, 2000);
}

/**
 * Validate numeric value within range
 * @param {number|string} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number|null}
 */
function validateNumber(value, min = 0, max = Infinity) {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
}

/**
 * Validate and sanitize input - used for general text fields
 * Prevents null bytes and removes leading/trailing whitespace
 * @param {string} input - Input to sanitize
 * @returns {string|null}
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return null;
  // Remove null bytes and trim
  return input.replace(/\0/g, '').trim() || null;
}

/**
 * Validate password strength
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain a number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateEmail,
  validatePhone,
  validateUrl,
  validateText,
  validateDescription,
  validateReason,
  validateMessage,
  validateNumber,
  sanitizeInput,
  validatePassword
};

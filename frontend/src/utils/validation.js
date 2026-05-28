/**
 * Frontend input validation utilities
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+\d{1,3})?[\d\s\-()]{10,20}$/;
const URL_REGEX = /^https?:\/\/.+/i;

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone.trim());
}

export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

export function validateFile(file, maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) {
  if (!file) return { valid: false, error: 'No file selected' };
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Only ${allowedTypes.map(t => t.split('/')[1]).join(', ')} images allowed` };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File must be under ${maxSizeMB}MB` };
  }

  return { valid: true };
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  const masked = local.length > 2 
    ? local.substring(0, 2) + '*'.repeat(Math.max(1, local.length - 3)) + local.substring(local.length - 1)
    : local;
  
  return `${masked}@${domain}`;
}

/**
 * Sanitize error message to prevent leaking backend details
 * @param {Error|string} error - Error to sanitize
 * @param {boolean} isDev - Whether in development mode
 * @returns {string}
 */
export function sanitizeErrorMessage(error, isDev = false) {
  if (isDev && error && error.message) {
    return error.message;
  }
  
  const message = typeof error === 'string' ? error : error?.message || 'An error occurred';
  
  // Generic message for production
  if (message.includes('TypeError') || message.includes('undefined') || message.includes('at ')) {
    return 'An error occurred. Please try again.';
  }
  
  return message;
}

/**
 * Validate occupancy against room capacity
 * @param {number} adultCount - Number of adults
 * @param {number} childCount - Number of children
 * @param {number} baseCapacity - Room base capacity
 * @param {number} maxCapacity - Room maximum capacity
 * @returns {string|null} Error message if validation fails, null if valid
 */
export function validateOccupancy(adultCount, childCount, baseCapacity, maxCapacity) {
  const totalGuests = Number(adultCount || 0) + Number(childCount || 0);
  const numBase = Number(baseCapacity || 0);
  const numMax = Number(maxCapacity || 0);
  
  if (totalGuests > numMax) {
    return `Total guests (${totalGuests}) exceeds room maximum capacity (${numMax})`;
  }
  
  if (adultCount < 1) {
    return 'At least one adult is required per booking';
  }
  
  return null;
}

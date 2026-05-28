/**
 * ENUM validation utilities
 * Ensures only valid enum values are used in the system
 */

const VALID_ENUMS = {
  payment_method: ['e_wallet', 'bank_transfer', 'cash'],
  payment_status: ['pending', 'paid', 'partial', 'failed', 'refunded', 'cancelled'],
  reservation_status: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'overstayed'],
  inquiry_status: ['new', 'read', 'responded'],
  cancellation_request_status: ['pending', 'approved', 'denied', 'completed'],
  refund_request_status: ['pending', 'approved', 'denied', 'processed'],
  room_status: ['reserved', 'checked_in', 'checked_out', 'cancelled', 'transferred'],
  booking_scope: ['single_room', 'multi_room', 'whole_resort'],
  availability_block_scope: ['room', 'whole_resort'],
  request_status: ['new', 'read', 'responded', 'pending', 'approved', 'denied', 'completed', 'processed']
};

/**
 * Validate that a value is in the allowed enum set
 * @param {string} enumName - Name of the enum (e.g., 'payment_status')
 * @param {string} value - Value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEnum(enumName, value) {
  if (!enumName || !value) return false;
  const validValues = VALID_ENUMS[enumName];
  if (!validValues) {
    console.warn(`[Enum Validation] Unknown enum: ${enumName}`);
    return false;
  }
  return validValues.includes(String(value).toLowerCase());
}

/**
 * Validate that a value is in the allowed enum set; throw error if invalid
 * @param {string} enumName - Name of the enum (e.g., 'payment_status')
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} - If value is not in enum
 */
function validateEnum(enumName, value, fieldName = enumName) {
  if (!isValidEnum(enumName, value)) {
    const validValues = VALID_ENUMS[enumName] || [];
    throw new Error(
      `Invalid ${fieldName}: "${value}". Allowed values: ${validValues.join(', ')}`
    );
  }
}

/**
 * Get list of valid enum values
 * @param {string} enumName - Name of the enum
 * @returns {string[]} - Array of valid values
 */
function getEnumValues(enumName) {
  return VALID_ENUMS[enumName] || [];
}

module.exports = {
  VALID_ENUMS,
  isValidEnum,
  validateEnum,
  getEnumValues
};

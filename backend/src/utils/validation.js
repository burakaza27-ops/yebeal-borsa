/* ============================================
   Validation Helpers
   Sanitizes and validates types and inputs to
   prevent crashes (NaN injection)
   ============================================ */

/**
 * Parses and validates a floating-point number.
 * Throws a ValidationError if invalid.
 */
export function parseAndValidateFloat(val, fieldName, isRequired = false, min = 0) {
  if (val === undefined || val === null || val === '') {
    if (isRequired) {
      const err = new Error(`${fieldName} is required.`);
      err.name = 'ValidationError';
      throw err;
    }
    return null;
  }
  const parsed = parseFloat(val);
  if (isNaN(parsed)) {
    const err = new Error(`Invalid value for ${fieldName}. Must be a valid number.`);
    err.name = 'ValidationError';
    throw err;
  }
  if (parsed < min) {
    const err = new Error(`${fieldName} must be at least ${min}.`);
    err.name = 'ValidationError';
    throw err;
  }
  return parsed;
}

/**
 * Parses and validates an integer.
 * Throws a ValidationError if invalid.
 */
export function parseAndValidateInt(val, fieldName, isRequired = false, min = 0) {
  if (val === undefined || val === null || val === '') {
    if (isRequired) {
      const err = new Error(`${fieldName} is required.`);
      err.name = 'ValidationError';
      throw err;
    }
    return null;
  }
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) {
    const err = new Error(`Invalid value for ${fieldName}. Must be a valid integer.`);
    err.name = 'ValidationError';
    throw err;
  }
  if (parsed < min) {
    const err = new Error(`${fieldName} must be at least ${min}.`);
    err.name = 'ValidationError';
    throw err;
  }
  return parsed;
}

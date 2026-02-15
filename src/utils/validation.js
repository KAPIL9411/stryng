/**
 * Validation Utilities
 * Pure functions for data validation
 * @module utils/validation
 */

import { REGEX, VALIDATION } from '../config/constants';

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!REGEX.EMAIL.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with strength
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 0 };
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
      strength: 0,
    };
  }

  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters`,
      strength: 0,
    };
  }

  // Calculate strength
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  const isStrong = strength >= 4;

  return {
    isValid: isStrong,
    error: isStrong
      ? null
      : 'Password must contain uppercase, lowercase, number, and special character',
    strength,
  };
};

/**
 * Validate phone number (Indian)
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== VALIDATION.PHONE_LENGTH) {
    return { isValid: false, error: 'Phone number must be 10 digits' };
  }

  if (!REGEX.PHONE.test(cleaned)) {
    return { isValid: false, error: 'Invalid phone number' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate PIN code (Indian)
 * @param {string} pinCode - PIN code to validate
 * @returns {Object} Validation result
 */
export const validatePinCode = (pinCode) => {
  if (!pinCode) {
    return { isValid: false, error: 'PIN code is required' };
  }

  const cleaned = pinCode.replace(/\D/g, '');

  if (cleaned.length !== VALIDATION.PIN_CODE_LENGTH) {
    return { isValid: false, error: 'PIN code must be 6 digits' };
  }

  if (!REGEX.PIN_CODE.test(cleaned)) {
    return { isValid: false, error: 'Invalid PIN code' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {Object} Validation result
 */
export const validateName = (name) => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < VALIDATION.NAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > VALIDATION.NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Name must be less than ${VALIDATION.NAME_MAX_LENGTH} characters`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  if (!VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
    };
  }

  if (file.size > VALIDATION.MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${VALIDATION.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate quantity
 * @param {number} quantity - Quantity to validate
 * @returns {Object} Validation result
 */
export const validateQuantity = (quantity) => {
  if (!quantity || quantity < 1) {
    return { isValid: false, error: 'Quantity must be at least 1' };
  }

  if (quantity > VALIDATION.MAX_CART_QUANTITY) {
    return {
      isValid: false,
      error: `Maximum quantity is ${VALIDATION.MAX_CART_QUANTITY}`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate price
 * @param {number} price - Price to validate
 * @returns {Object} Validation result
 */
export const validatePrice = (price) => {
  if (price === undefined || price === null) {
    return { isValid: false, error: 'Price is required' };
  }

  if (typeof price !== 'number' || isNaN(price)) {
    return { isValid: false, error: 'Price must be a number' };
  }

  if (price < 0) {
    return { isValid: false, error: 'Price cannot be negative' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate product data
 * @param {Object} product - Product data to validate
 * @returns {Object} Validation result
 */
export const validateProduct = (product) => {
  const errors = {};

  if (!product.name || product.name.trim().length < 3) {
    errors.name = 'Product name must be at least 3 characters';
  }

  if (!product.description || product.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  const priceValidation = validatePrice(product.price);
  if (!priceValidation.isValid) {
    errors.price = priceValidation.error;
  }

  if (!product.category) {
    errors.category = 'Category is required';
  }

  if (!product.images || product.images.length === 0) {
    errors.images = 'At least one image is required';
  }

  if (!product.sizes || product.sizes.length === 0) {
    errors.sizes = 'At least one size is required';
  }

  if (!product.colors || product.colors.length === 0) {
    errors.colors = 'At least one color is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate address
 * @param {Object} address - Address data to validate
 * @returns {Object} Validation result
 */
export const validateAddress = (address) => {
  const errors = {};

  const nameValidation = validateName(address.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  }

  if (!address.street || address.street.trim().length < 5) {
    errors.street = 'Street address must be at least 5 characters';
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'City is required';
  }

  if (!address.state || address.state.trim().length < 2) {
    errors.state = 'State is required';
  }

  const pinValidation = validatePinCode(address.pin);
  if (!pinValidation.isValid) {
    errors.pin = pinValidation.error;
  }

  const phoneValidation = validatePhone(address.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export const validateURL = (url) => {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true, error: null };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * Validate form data with multiple fields
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules for each field
 * @returns {Object} Validation result with errors object
 */
export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const rule = rules[field];
    const value = data[field];

    // Required validation
    if (
      rule.required &&
      (!value || (typeof value === 'string' && !value.trim()))
    ) {
      errors[field] = rule.message || `${field} is required`;
      return;
    }

    // Skip other validations if field is empty and not required
    if (!value && !rule.required) return;

    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors[field] =
        rule.message ||
        `${field} must be at least ${rule.minLength} characters`;
      return;
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] =
        rule.message ||
        `${field} must be less than ${rule.maxLength} characters`;
      return;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${field} format is invalid`;
      return;
    }

    // Custom validation function
    if (rule.validate) {
      const result = rule.validate(value, data);
      if (!result.isValid) {
        errors[field] = result.error;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate required field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true, error: null };
};

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateLength = (value, min, max, fieldName = 'Field') => {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const length = value.trim().length;

  if (length < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min} characters`,
    };
  }

  if (max && length > max) {
    return {
      isValid: false,
      error: `${fieldName} must be less than ${max} characters`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate password confirmation
 * @param {string} password - Password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} Validation result
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true, error: null };
};

/**
 * Validate checkbox is checked
 * @param {boolean} checked - Checkbox state
 * @param {string} message - Error message
 * @returns {Object} Validation result
 */
export const validateCheckbox = (
  checked,
  message = 'You must accept the terms'
) => {
  if (!checked) {
    return { isValid: false, error: message };
  }
  return { isValid: true, error: null };
};

/**
 * Validate array has items
 * @param {Array} array - Array to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateArray = (array, fieldName = 'Field') => {
  if (!Array.isArray(array) || array.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} must have at least one item`,
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateRange = (value, min, max, fieldName = 'Value') => {
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { isValid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { isValid: true, error: null };
};

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateDate = (date, fieldName = 'Date') => {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: `${fieldName} is invalid` };
  }

  return { isValid: true, error: null };
};

/**
 * Validate future date
 * @param {string|Date} date - Date to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateFutureDate = (date, fieldName = 'Date') => {
  const dateValidation = validateDate(date, fieldName);
  if (!dateValidation.isValid) return dateValidation;

  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();

  if (dateObj <= now) {
    return { isValid: false, error: `${fieldName} must be in the future` };
  }

  return { isValid: true, error: null };
};

/**
 * Batch validate multiple values
 * @param {Array} validations - Array of validation functions to run
 * @returns {Object} Combined validation result
 */
export const batchValidate = (validations) => {
  const errors = [];

  for (const validation of validations) {
    if (!validation.isValid) {
      errors.push(validation.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    error: errors[0] || null,
  };
};

/**
 * API Helper Utilities
 * Provides field selection, error handling, and performance monitoring for API endpoints
 * @module utils/apiHelpers
 */

/**
 * APIErrorHandler - Standardized error handling for API responses
 */
export class APIErrorHandler {
  // Standard error codes
  static ERROR_CODES = {
    // Client errors (4xx)
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    
    // Server errors (5xx)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  };

  // HTTP status code mapping
  static STATUS_CODES = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION_ERROR: 422,
    RATE_LIMIT_EXCEEDED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    DATABASE_ERROR: 500,
    EXTERNAL_SERVICE_ERROR: 502,
  };

  /**
   * Create a structured error response
   * @param {string} code - Error code from ERROR_CODES
   * @param {string} message - Human-readable error message
   * @param {Object} details - Additional error details
   * @returns {Object} Structured error response
   */
  static createError(code, message, details = {}) {
    const statusCode = this.STATUS_CODES[code] || 500;
    
    return {
      error: {
        code,
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        ...details,
      },
    };
  }

  /**
   * Handle Supabase errors and convert to structured format
   * @param {Error} error - Supabase error object
   * @returns {Object} Structured error response
   */
  static handleSupabaseError(error) {
    console.error('Supabase error:', error);

    // Check for specific Supabase error codes
    if (error.code === 'PGRST116') {
      return this.createError(
        this.ERROR_CODES.NOT_FOUND,
        'Resource not found',
        { originalError: error.message }
      );
    }

    if (error.code === '23505') {
      return this.createError(
        this.ERROR_CODES.CONFLICT,
        'Resource already exists',
        { originalError: error.message }
      );
    }

    if (error.code === '23503') {
      return this.createError(
        this.ERROR_CODES.BAD_REQUEST,
        'Invalid reference - related resource does not exist',
        { originalError: error.message }
      );
    }

    // Default to database error
    return this.createError(
      this.ERROR_CODES.DATABASE_ERROR,
      'Database operation failed',
      { originalError: error.message }
    );
  }

  /**
   * Handle validation errors
   * @param {Array} validationErrors - Array of validation error objects
   * @returns {Object} Structured error response
   */
  static handleValidationError(validationErrors) {
    return this.createError(
      this.ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      { validationErrors }
    );
  }

  /**
   * Handle rate limit errors
   * @param {number} resetTime - Timestamp when rate limit resets
   * @returns {Object} Structured error response
   */
  static handleRateLimitError(resetTime) {
    return this.createError(
      this.ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { 
        resetTime,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      }
    );
  }
}

/**
 * FieldSelector - Implements field selection for API responses
 */
export class FieldSelector {
  /**
   * Parse fields parameter from query string
   * @param {string} fieldsParam - Comma-separated list of fields
   * @returns {Array<string>|null} Array of field names or null for all fields
   */
  static parseFields(fieldsParam) {
    if (!fieldsParam || typeof fieldsParam !== 'string') {
      return null;
    }

    const fields = fieldsParam
      .split(',')
      .map(field => field.trim())
      .filter(field => field.length > 0);
    
    // Return null if no valid fields after filtering
    return fields.length > 0 ? fields : null;
  }

  /**
   * Select specific fields from an object
   * @param {Object} obj - Source object
   * @param {Array<string>} fields - Fields to select
   * @returns {Object} Object with only selected fields
   */
  static selectFields(obj, fields) {
    if (!fields || fields.length === 0) {
      return obj;
    }

    const result = {};
    
    for (const field of fields) {
      // Support nested field selection with dot notation
      if (field.includes('.')) {
        const parts = field.split('.');
        const topLevel = parts[0];
        
        if (obj[topLevel] !== undefined) {
          if (!result[topLevel]) {
            result[topLevel] = {};
          }
          
          // For nested fields, include the nested property
          const nestedField = parts.slice(1).join('.');
          if (typeof obj[topLevel] === 'object' && obj[topLevel] !== null) {
            const nestedValue = this.getNestedValue(obj[topLevel], nestedField);
            this.setNestedValue(result[topLevel], nestedField, nestedValue);
          }
        }
      } else {
        // Simple field selection
        if (obj[field] !== undefined) {
          result[field] = obj[field];
        }
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Source object
   * @param {string} path - Dot-separated path
   * @returns {*} Value at path or undefined
   */
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   * @param {Object} obj - Target object
   * @param {string} path - Dot-separated path
   * @param {*} value - Value to set
   */
  static setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Apply field selection to array of objects
   * @param {Array<Object>} array - Array of objects
   * @param {Array<string>} fields - Fields to select
   * @returns {Array<Object>} Array with field selection applied
   */
  static selectFieldsFromArray(array, fields) {
    if (!Array.isArray(array)) {
      return array;
    }

    if (!fields || fields.length === 0) {
      return array;
    }

    return array.map(item => this.selectFields(item, fields));
  }
}

/**
 * APIPerformanceMonitor - Tracks API request performance
 */
export class APIPerformanceMonitor {
  static SLOW_REQUEST_THRESHOLD = 500; // ms
  static stats = {
    totalRequests: 0,
    slowRequests: 0,
    totalResponseTime: 0,
    requestsByEndpoint: {},
  };

  /**
   * Start monitoring an API request
   * @param {string} endpoint - API endpoint being called
   * @returns {Object} Monitor object with end() method
   */
  static startRequest(endpoint) {
    const startTime = performance.now();
    
    return {
      endpoint,
      startTime,
      
      /**
       * End monitoring and log performance
       * @param {boolean} success - Whether request succeeded
       * @param {number} statusCode - HTTP status code
       */
      end: (success = true, statusCode = 200) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Update statistics
        this.stats.totalRequests++;
        this.stats.totalResponseTime += duration;
        
        if (!this.stats.requestsByEndpoint[endpoint]) {
          this.stats.requestsByEndpoint[endpoint] = {
            count: 0,
            totalTime: 0,
            slowCount: 0,
          };
        }
        
        const endpointStats = this.stats.requestsByEndpoint[endpoint];
        endpointStats.count++;
        endpointStats.totalTime += duration;
        
        // Log slow requests
        if (duration > this.SLOW_REQUEST_THRESHOLD) {
          this.stats.slowRequests++;
          endpointStats.slowCount++;
          
          console.warn(`⚠️ Slow API request (${duration.toFixed(2)}ms):`, {
            endpoint,
            duration: `${duration.toFixed(2)}ms`,
            statusCode,
            success,
            threshold: `${this.SLOW_REQUEST_THRESHOLD}ms`,
          });
        } else {
          console.log(`✅ API request completed (${duration.toFixed(2)}ms):`, {
            endpoint,
            duration: `${duration.toFixed(2)}ms`,
            statusCode,
            success,
          });
        }
        
        return duration;
      },
    };
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  static getStats() {
    const avgResponseTime = this.stats.totalRequests > 0
      ? this.stats.totalResponseTime / this.stats.totalRequests
      : 0;
    
    const endpointStats = Object.entries(this.stats.requestsByEndpoint).map(
      ([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        slowCount: stats.slowCount,
        slowPercentage: stats.count > 0 ? (stats.slowCount / stats.count) * 100 : 0,
      })
    );
    
    return {
      totalRequests: this.stats.totalRequests,
      slowRequests: this.stats.slowRequests,
      slowPercentage: this.stats.totalRequests > 0
        ? (this.stats.slowRequests / this.stats.totalRequests) * 100
        : 0,
      avgResponseTime: avgResponseTime.toFixed(2),
      endpoints: endpointStats,
    };
  }

  /**
   * Reset statistics
   */
  static reset() {
    this.stats = {
      totalRequests: 0,
      slowRequests: 0,
      totalResponseTime: 0,
      requestsByEndpoint: {},
    };
  }

  /**
   * Log current statistics
   */
  static logStats() {
    const stats = this.getStats();
    console.log('📊 API Performance Statistics:', stats);
    return stats;
  }
}

/**
 * Wrapper function to monitor API calls
 * @param {string} endpoint - API endpoint name
 * @param {Function} apiCall - Async function that makes the API call
 * @returns {Promise} Result of the API call
 */
export async function monitoredAPICall(endpoint, apiCall) {
  const monitor = APIPerformanceMonitor.startRequest(endpoint);
  
  try {
    const result = await apiCall();
    monitor.end(true, 200);
    return result;
  } catch (error) {
    const statusCode = error.statusCode || 500;
    monitor.end(false, statusCode);
    throw error;
  }
}

/**
 * Get user-friendly error message for authentication errors
 * @param {Error} error - Authentication error
 * @returns {string} User-friendly error message
 */
export function getAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred';

  const message = error.message || error.error_description || '';

  // Supabase auth error codes
  if (error.code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }

  if (error.code === 'email_not_confirmed' || message.includes('Email not confirmed')) {
    return 'Please verify your email address';
  }

  if (error.code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with this email already exists';
  }

  if (error.code === 'weak_password' || message.includes('Password should be')) {
    return 'Password is too weak. Please use at least 6 characters';
  }

  if (error.code === 'invalid_email' || message.includes('Invalid email')) {
    return 'Please enter a valid email address';
  }

  if (error.code === 'email_exists' || message.includes('email address is already')) {
    return 'This email is already registered';
  }

  if (error.code === 'over_email_send_rate_limit') {
    return 'Too many requests. Please try again later';
  }

  if (error.code === 'validation_failed') {
    return 'Please check your input and try again';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection';
  }

  // Return original message if no specific match
  return message || 'Authentication failed. Please try again';
}

/**
 * Get user-friendly error message for database errors
 * @param {Error} error - Database error
 * @returns {string} User-friendly error message
 */
export function getDatabaseErrorMessage(error) {
  if (!error) return 'An unknown error occurred';

  const message = error.message || '';
  const code = error.code || '';

  // PostgreSQL error codes
  if (code === '23505') {
    return 'This item already exists';
  }

  if (code === '23503') {
    return 'Cannot complete operation - related item not found';
  }

  if (code === '23502') {
    return 'Required field is missing';
  }

  if (code === '22P02') {
    return 'Invalid data format';
  }

  if (code === '42P01') {
    return 'Database table not found';
  }

  if (code === '42703') {
    return 'Database column not found';
  }

  // Supabase specific errors
  if (code === 'PGRST116') {
    return 'Item not found';
  }

  if (code === 'PGRST204') {
    return 'No data returned';
  }

  if (message.includes('duplicate key')) {
    return 'This item already exists';
  }

  if (message.includes('foreign key')) {
    return 'Cannot complete operation - related item not found';
  }

  if (message.includes('not null')) {
    return 'Required field is missing';
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Operation timed out. Please try again';
  }

  if (message.includes('connection')) {
    return 'Database connection error. Please try again';
  }

  // Return original message if no specific match
  return message || 'Database operation failed. Please try again';
}

/**
 * Handle API errors with consistent format
 * @param {Error} error - API error
 * @param {string} context - Context where error occurred
 * @returns {Object} Structured error response
 */
export function handleAPIError(error, context = 'API') {
  console.error(`${context} error:`, error);

  // If already a structured error, return it
  if (error.error) {
    return error;
  }

  // Check if it's an auth error
  if (error.status === 401 || error.code?.includes('auth')) {
    return APIErrorHandler.createError(
      APIErrorHandler.ERROR_CODES.UNAUTHORIZED,
      getAuthErrorMessage(error)
    );
  }

  // Check if it's a database error
  if (error.code && (error.code.startsWith('23') || error.code.startsWith('42') || error.code === 'PGRST116')) {
    return APIErrorHandler.createError(
      APIErrorHandler.ERROR_CODES.DATABASE_ERROR,
      getDatabaseErrorMessage(error)
    );
  }

  // Check if it's a validation error
  if (error.status === 422 || error.code === 'validation_failed') {
    return APIErrorHandler.createError(
      APIErrorHandler.ERROR_CODES.VALIDATION_ERROR,
      error.message || 'Validation failed'
    );
  }

  // Default to internal error
  return APIErrorHandler.createError(
    APIErrorHandler.ERROR_CODES.INTERNAL_ERROR,
    error.message || 'An error occurred'
  );
}

/**
 * Wrap API calls with error handling
 * @param {Function} apiCall - Async function that makes the API call
 * @param {string} context - Context where call is made
 * @returns {Promise} Result of the API call
 */
export async function withErrorHandling(apiCall, context = 'API') {
  try {
    return await apiCall();
  } catch (error) {
    throw handleAPIError(error, context);
  }
}

// Export default object with all utilities
export default {
  APIErrorHandler,
  FieldSelector,
  APIPerformanceMonitor,
  monitoredAPICall,
  getAuthErrorMessage,
  getDatabaseErrorMessage,
  handleAPIError,
  withErrorHandling,
};

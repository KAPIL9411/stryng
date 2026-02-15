/**
 * Rate Limit Middleware
 * Provides rate limiting functionality for API requests
 * @module utils/rateLimitMiddleware
 */

import { rateLimiter } from '../services/RateLimiter';

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(message, resetTime, limit, remaining = 0) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.resetTime = resetTime;
    this.limit = limit;
    this.remaining = remaining;
  }
}

/**
 * Get identifier for rate limiting (user ID or IP)
 * @param {Object} user - User object from auth
 * @returns {string} Identifier for rate limiting
 */
function getIdentifier(user) {
  if (user?.id) {
    return `user:${user.id}`;
  }
  // For anonymous users, we'd typically use IP address
  // In a browser context, we'll use a session-based identifier
  // In production, this would be handled by the backend
  return 'anonymous:browser';
}

/**
 * Get user type for rate limiting
 * @param {Object} user - User object from auth
 * @returns {string} User type ('anonymous', 'authenticated', or 'admin')
 */
function getUserType(user) {
  if (!user) return 'anonymous';
  if (user.role === 'admin') return 'admin';
  return 'authenticated';
}

/**
 * Apply rate limiting to an API request
 * @param {Object} user - User object from auth (optional)
 * @returns {Promise<Object>} Rate limit info
 * @throws {RateLimitError} If rate limit is exceeded
 */
export async function applyRateLimit(user = null) {
  const identifier = getIdentifier(user);
  const userType = getUserType(user);

  const result = await rateLimiter.checkLimit(identifier, userType);

  if (!result.allowed) {
    throw new RateLimitError(
      'Rate limit exceeded. Please try again later.',
      result.resetTime,
      result.limit,
      result.remaining
    );
  }

  return {
    limit: result.limit,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * Get rate limit headers for API response
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Object} Headers object
 */
export function getRateLimitHeaders(rateLimitInfo) {
  return {
    'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
    'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
  };
}

/**
 * Wrapper function to add rate limiting to API calls
 * @param {Function} apiFunction - The API function to wrap
 * @param {Object} user - User object from auth (optional)
 * @returns {Function} Wrapped function with rate limiting
 */
export function withRateLimit(apiFunction, user = null) {
  return async (...args) => {
    try {
      // Check rate limit before making the API call
      const rateLimitInfo = await applyRateLimit(user);

      // Make the API call
      const result = await apiFunction(...args);

      // Attach rate limit info to the result (for logging/debugging)
      if (result && typeof result === 'object') {
        result._rateLimitInfo = rateLimitInfo;
      }

      return result;
    } catch (error) {
      // If it's a rate limit error, enhance it with headers
      if (error instanceof RateLimitError) {
        error.headers = getRateLimitHeaders({
          limit: error.limit,
          remaining: error.remaining,
          resetTime: error.resetTime,
        });
      }
      throw error;
    }
  };
}

/**
 * Check rate limit status without consuming a request
 * @param {Object} user - User object from auth (optional)
 * @returns {Promise<Object>} Rate limit status
 */
export async function checkRateLimitStatus(user = null) {
  const identifier = getIdentifier(user);
  const userType = getUserType(user);

  return await rateLimiter.getStatus(identifier, userType);
}

/**
 * Reset rate limit for a user (admin function)
 * @param {Object} user - User object
 * @returns {Promise<boolean>} Success status
 */
export async function resetUserRateLimit(user) {
  if (!user?.id) return false;
  const identifier = `user:${user.id}`;
  return await rateLimiter.resetLimit(identifier);
}

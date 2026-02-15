/**
 * Rate Limiter Service
 * Implements rate limiting for API requests using Redis
 * @module services/RateLimiter
 */

import { Redis } from '@upstash/redis';

/**
 * RateLimiter class for managing API request rate limits
 * Uses sliding window algorithm with Redis for distributed rate limiting
 */
class RateLimiter {
  constructor() {
    this.client = null;
    this.initialized = false;

    // Rate limit configurations (requests per 15 minutes)
    this.limits = {
      anonymous: {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
      },
      authenticated: {
        maxRequests: 300,
        windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
      },
      admin: {
        maxRequests: 1000,
        windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
      },
    };
  }

  /**
   * Initialize Redis client
   * Lazy initialization to avoid errors if env vars are missing
   * @private
   */
  _initializeClient() {
    if (this.initialized) return;

    const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
    const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('⚠️ Redis not configured. Rate limiting disabled.');
      this.client = null;
      this.initialized = true;
      return;
    }

    try {
      this.client = new Redis({ url, token });
      console.log('✅ RateLimiter initialized');
      this.initialized = true;
    } catch (error) {
      console.error('❌ RateLimiter initialization failed:', error);
      this.client = null;
      this.initialized = true;
    }
  }

  /**
   * Get Redis client instance
   * @private
   * @returns {Redis|null} Redis client or null if not configured
   */
  _getClient() {
    if (!this.initialized) {
      this._initializeClient();
    }
    return this.client;
  }

  /**
   * Generate rate limit key for a user/IP
   * @private
   * @param {string} identifier - User ID or IP address
   * @returns {string} Redis key for rate limiting
   */
  _getRateLimitKey(identifier) {
    return `ratelimit:${identifier}`;
  }

  /**
   * Get rate limit configuration based on user type
   * @private
   * @param {string} userType - 'anonymous', 'authenticated', or 'admin'
   * @returns {Object} Rate limit configuration
   */
  _getLimitConfig(userType) {
    return this.limits[userType] || this.limits.anonymous;
  }

  /**
   * Check if request is within rate limit
   * @param {string} identifier - User ID or IP address
   * @param {string} userType - 'anonymous', 'authenticated', or 'admin'
   * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number, limit: number}>}
   */
  async checkLimit(identifier, userType = 'anonymous') {
    const client = this._getClient();

    // If Redis is not configured, allow all requests
    if (!client) {
      console.warn('⚠️ Rate limiting disabled (Redis not configured)');
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 15 * 60 * 1000,
        limit: 999,
      };
    }

    const config = this._getLimitConfig(userType);
    const key = this._getRateLimitKey(identifier);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis sorted set to track requests in sliding window
      // Score is timestamp, member is unique request ID

      // Remove old requests outside the window
      await client.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await client.zcard(key);

      // Check if limit exceeded
      if (requestCount >= config.maxRequests) {
        console.log(`🚫 Rate limit exceeded for ${identifier} (${userType})`);

        // Get oldest request timestamp to calculate reset time
        const oldestRequests = await client.zrange(key, 0, 0, { withScores: true });
        const resetTime = oldestRequests.length > 0
          ? parseInt(oldestRequests[0].score) + config.windowMs
          : now + config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          limit: config.maxRequests,
        };
      }

      // Add current request to the window
      const requestId = `${now}:${Math.random()}`;
      await client.zadd(key, { score: now, member: requestId });

      // Set expiry on the key (cleanup)
      await client.expire(key, Math.ceil(config.windowMs / 1000));

      const remaining = config.maxRequests - requestCount - 1;

      console.log(`✅ Rate limit check passed for ${identifier} (${remaining} remaining)`);

      return {
        allowed: true,
        remaining,
        resetTime: now + config.windowMs,
        limit: config.maxRequests,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        limit: config.maxRequests,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * @param {string} identifier - User ID or IP address
   * @returns {Promise<boolean>} Success status
   */
  async resetLimit(identifier) {
    const client = this._getClient();
    if (!client) return false;

    try {
      const key = this._getRateLimitKey(identifier);
      await client.del(key);
      console.log(`✅ Rate limit reset for ${identifier}`);
      return true;
    } catch (error) {
      console.error('Rate limit reset error:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status for an identifier
   * @param {string} identifier - User ID or IP address
   * @param {string} userType - 'anonymous', 'authenticated', or 'admin'
   * @returns {Promise<{count: number, remaining: number, limit: number}>}
   */
  async getStatus(identifier, userType = 'anonymous') {
    const client = this._getClient();

    if (!client) {
      return {
        count: 0,
        remaining: 999,
        limit: 999,
      };
    }

    const config = this._getLimitConfig(userType);
    const key = this._getRateLimitKey(identifier);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Remove old requests
      await client.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const count = await client.zcard(key);
      const remaining = Math.max(0, config.maxRequests - count);

      return {
        count,
        remaining,
        limit: config.maxRequests,
      };
    } catch (error) {
      console.error('Rate limit status error:', error);
      return {
        count: 0,
        remaining: config.maxRequests,
        limit: config.maxRequests,
      };
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export class for testing
export default RateLimiter;

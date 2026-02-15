/**
 * Redis Cache Service
 * Provides structured caching for API responses with different TTL strategies
 * @module services/RedisCacheService
 */

import { Redis } from '@upstash/redis';

/**
 * RedisCacheService class for managing API response caching
 * Implements get, set, and invalidate methods with configurable TTL
 */
class RedisCacheService {
  constructor() {
    this.client = null;
    this.initialized = false;
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
      console.warn('⚠️ Redis not configured. Caching disabled.');
      this.client = null;
      this.initialized = true;
      return;
    }

    try {
      this.client = new Redis({ url, token });
      console.log('✅ RedisCacheService initialized');
      this.initialized = true;
    } catch (error) {
      console.error('❌ RedisCacheService initialization failed:', error);
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
   * Get cached data by key
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null if not found
   */
  async get(key) {
    const client = this._getClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      if (data) {
        console.log(`✅ Cache HIT: ${key}`);
        return data;
      }
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`Redis get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl) {
    const client = this._getClient();
    if (!client) return false;

    try {
      await client.set(key, value, { ex: ttl });
      console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`Redis set error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Invalidate (delete) cached data by key
   * @param {string} key - Cache key to invalidate
   * @returns {Promise<boolean>} Success status
   */
  async invalidate(key) {
    const client = this._getClient();
    if (!client) return false;

    try {
      await client.del(key);
      console.log(`✅ Cache INVALIDATE: ${key}`);
      return true;
    } catch (error) {
      console.error(`Redis invalidate error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Invalidate multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., "products:*")
   * @returns {Promise<number>} Number of keys invalidated
   */
  async invalidatePattern(pattern) {
    const client = this._getClient();
    if (!client) return 0;

    try {
      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        console.log(`ℹ️ No keys found for pattern: ${pattern}`);
        return 0;
      }

      await client.del(...keys);
      console.log(`✅ Cache INVALIDATE pattern: ${pattern} (${keys.length} keys)`);
      return keys.length;
    } catch (error) {
      console.error(`Redis invalidate pattern error for "${pattern}":`, error);
      return 0;
    }
  }

  /**
   * Cache product data with 5 minute TTL
   * @param {string} key - Cache key
   * @param {any} data - Product data to cache
   * @returns {Promise<boolean>} Success status
   */
  async cacheProductData(key, data) {
    const TTL_5_MINUTES = 5 * 60;
    return await this.set(key, data, TTL_5_MINUTES);
  }

  /**
   * Cache user data with 1 minute TTL
   * @param {string} key - Cache key
   * @param {any} data - User data to cache
   * @returns {Promise<boolean>} Success status
   */
  async cacheUserData(key, data) {
    const TTL_1_MINUTE = 1 * 60;
    return await this.set(key, data, TTL_1_MINUTE);
  }

  /**
   * Cache static content with 1 hour TTL
   * @param {string} key - Cache key
   * @param {any} data - Static content to cache
   * @returns {Promise<boolean>} Success status
   */
  async cacheStaticContent(key, data) {
    const TTL_1_HOUR = 60 * 60;
    return await this.set(key, data, TTL_1_HOUR);
  }

  /**
   * Get or set cached data (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Data from cache or fetch function
   */
  async getOrSet(key, fetchFn, ttl) {
    const client = this._getClient();

    // If Redis is not configured, just fetch directly
    if (!client) {
      console.log('⚠️ Redis not available, fetching directly');
      return await fetchFn();
    }

    // Try to get from cache
    try {
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      console.warn('Redis cache read failed, falling back to direct fetch:', error);
    }

    // Fetch fresh data
    try {
      const data = await fetchFn();

      // Try to cache the result (non-blocking)
      this.set(key, data, ttl).catch((err) => {
        console.warn('Redis cache write failed (non-critical):', err);
      });

      return data;
    } catch (error) {
      console.error('getOrSet error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();

// Export class for testing
export default RedisCacheService;

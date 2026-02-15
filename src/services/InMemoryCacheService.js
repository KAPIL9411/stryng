/**
 * In-Memory Cache Service
 * High-performance in-memory caching for API responses
 * Used when Redis is not available
 * @module services/InMemoryCacheService
 */

class InMemoryCacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Get cached data by key
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found
   */
  get(key) {
    if (this.cache.has(key)) {
      this.stats.hits++;
      return this.cache.get(key);
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set cache
    this.cache.set(key, value);
    this.stats.sets++;

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Invalidate (delete) cached data by key
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., "products:*")
   * @returns {number} Number of keys invalidated
   */
  invalidatePattern(pattern) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }
}

// Export singleton instance
export const inMemoryCache = new InMemoryCacheService();

// Export class for testing
export default InMemoryCacheService;

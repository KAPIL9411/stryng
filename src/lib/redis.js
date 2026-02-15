/**
 * Redis Cache Client (Upstash)
 * Provides caching for products, sessions, and rate limiting
 * @module lib/redis
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
let redis = null;

/**
 * Get Redis client instance
 * Lazy initialization to avoid errors if env vars are missing
 */
export const getRedisClient = () => {
  if (redis) return redis;

  const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('⚠️ Redis not configured. Caching disabled.');
    return null;
  }

  try {
    redis = new Redis({
      url,
      token,
    });
    console.log('✅ Redis client initialized');
    return redis;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    return null;
  }
};

// Cache key prefixes
export const CACHE_KEYS = {
  PRODUCTS_ALL: 'products:all',
  PRODUCTS_PAGE: (page, filters) =>
    `products:page:${page}:${JSON.stringify(filters)}`,
  PRODUCT_DETAIL: (slug) => `product:${slug}`,
  TRENDING_PRODUCTS: 'products:trending',
  NEW_PRODUCTS: 'products:new',
  CATEGORIES: 'categories',
  BANNERS: 'banners',
  USER_CART: (userId) => `cart:${userId}`,
  USER_SESSION: (userId) => `session:${userId}`,
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  PRODUCTS: 5 * 60, // 5 minutes
  PRODUCT_DETAIL: 10 * 60, // 10 minutes
  TRENDING: 15 * 60, // 15 minutes
  CATEGORIES: 30 * 60, // 30 minutes
  BANNERS: 60 * 60, // 1 hour
  CART: 24 * 60 * 60, // 24 hours
  SESSION: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached data or null
 */
export const getCached = async (key) => {
  const client = getRedisClient();
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
    console.error('Redis get error:', error);
    return null;
  }
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
export const setCached = async (key, value, ttl = CACHE_TTL.PRODUCTS) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.set(key, value, { ex: ttl });
    console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
export const deleteCached = async (key) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    console.log(`✅ Cache DELETE: ${key}`);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
};

/**
 * Delete multiple cached keys by pattern
 * @param {string} pattern - Key pattern (e.g., "products:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export const deleteCachedPattern = async (pattern) => {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    await client.del(...keys);
    console.log(`✅ Cache DELETE pattern: ${pattern} (${keys.length} keys)`);
    return keys.length;
  } catch (error) {
    console.error('Redis delete pattern error:', error);
    return 0;
  }
};

/**
 * Invalidate all product caches
 * Call this when products are updated
 */
export const invalidateProductCache = async () => {
  await deleteCachedPattern('products:*');
  await deleteCachedPattern('product:*');
};

/**
 * Get or set cached data (cache-aside pattern)
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Data from cache or fetch function
 */
export const getOrSet = async (key, fetchFn, ttl = CACHE_TTL.PRODUCTS) => {
  const client = getRedisClient();

  // If Redis is not configured, just fetch directly
  if (!client) {
    console.log('⚠️ Redis not available, fetching directly');
    return await fetchFn();
  }

  // Try to get from cache
  try {
    const cached = await getCached(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    console.warn(
      'Redis cache read failed, falling back to direct fetch:',
      error
    );
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();

    // Try to cache the result (non-blocking)
    setCached(key, data, ttl).catch((err) => {
      console.warn('Redis cache write failed (non-critical):', err);
    });

    return data;
  } catch (error) {
    console.error('getOrSet error:', error);
    throw error;
  }
};

/**
 * Rate limiting using Redis
 * @param {string} identifier - User ID, IP, or other identifier
 * @param {number} limit - Max requests allowed
 * @param {number} window - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export const rateLimit = async (identifier, limit = 100, window = 60) => {
  const client = getRedisClient();
  if (!client) return { allowed: true, remaining: limit };

  const key = `ratelimit:${identifier}`;

  try {
    const current = await client.incr(key);

    if (current === 1) {
      // First request, set expiry
      await client.expire(key, window);
    }

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    if (!allowed) {
      console.warn(`⚠️ Rate limit exceeded: ${identifier}`);
    }

    return { allowed, remaining };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true, remaining: limit };
  }
};

/**
 * Store user cart in Redis
 * @param {string} userId - User ID
 * @param {Array} cart - Cart items
 */
export const cacheUserCart = async (userId, cart) => {
  const key = CACHE_KEYS.USER_CART(userId);
  await setCached(key, cart, CACHE_TTL.CART);
};

/**
 * Get user cart from Redis
 * @param {string} userId - User ID
 * @returns {Promise<Array|null>} Cart items or null
 */
export const getCachedUserCart = async (userId) => {
  const key = CACHE_KEYS.USER_CART(userId);
  return await getCached(key);
};

/**
 * Clear user cart from Redis
 * @param {string} userId - User ID
 */
export const clearCachedUserCart = async (userId) => {
  const key = CACHE_KEYS.USER_CART(userId);
  await deleteCached(key);
};

// Export Redis client for advanced usage
export { redis };

export default {
  getCached,
  setCached,
  deleteCached,
  deleteCachedPattern,
  invalidateProductCache,
  getOrSet,
  rateLimit,
  cacheUserCart,
  getCachedUserCart,
  clearCachedUserCart,
  CACHE_KEYS,
  CACHE_TTL,
};

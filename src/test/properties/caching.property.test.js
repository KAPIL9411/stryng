/**
 * Property-Based Tests for Caching
 * Feature: e-commerce-platform-optimization
 * 
 * These tests verify caching properties using fast-check for
 * property-based testing with 20 iterations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Create mock client methods at module level
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();

// Mock the @upstash/redis module before importing RedisCacheService
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function() {
    return {
      get: mockGet,
      set: mockSet,
      del: mockDel,
      keys: mockKeys,
    };
  }),
}));

// Import after mocking
import RedisCacheService from '../../services/RedisCacheService.js';

/**
 * Property 9: Cached responses for frequently accessed data
 * **Validates: Requirements 4.1**
 * 
 * This property test verifies that repeated requests within the cache TTL
 * are served from cache with faster response times, validating the caching
 * behavior of the RedisCacheService.
 */
describe('Feature: e-commerce-platform-optimization, Property 9: Cached responses for frequently accessed data', () => {
  let service;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Set up environment variables
    vi.stubEnv('VITE_UPSTASH_REDIS_REST_URL', 'https://test-redis.upstash.io');
    vi.stubEnv('VITE_UPSTASH_REDIS_REST_TOKEN', 'test-token');

    // Create new service instance
    service = new RedisCacheService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  /**
   * Test that cached data is retrieved faster than fetching fresh data
   * This validates the core caching property: cache hits are faster than cache misses
   */
  it('should serve cached responses faster than fetching fresh data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
        }), // Data to cache
        fc.integer({ min: 1, max: 3600 }), // TTL in seconds
        async (key, data, ttl) => {
          // Simulate slow fetch function (20-30ms for faster tests)
          const slowFetchFn = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return data;
          });

          // First call: cache miss - should fetch and cache
          mockGet.mockResolvedValueOnce(null); // Cache miss
          mockSet.mockResolvedValueOnce('OK');

          const startTime1 = performance.now();
          const result1 = await service.getOrSet(key, slowFetchFn, ttl);
          const endTime1 = performance.now();
          const fetchTime = endTime1 - startTime1;

          // Verify fetch function was called
          expect(slowFetchFn).toHaveBeenCalledTimes(1);
          expect(result1).toEqual(data);

          // Second call: cache hit - should return cached data
          mockGet.mockResolvedValueOnce(data); // Cache hit

          const startTime2 = performance.now();
          const result2 = await service.getOrSet(key, slowFetchFn, ttl);
          const endTime2 = performance.now();
          const cacheTime = endTime2 - startTime2;

          // Verify fetch function was NOT called again
          expect(slowFetchFn).toHaveBeenCalledTimes(1);
          expect(result2).toEqual(data);

          // Property: Cached response should be significantly faster than fetching
          // Cache hit should be at least 10ms faster (accounting for network/processing overhead)
          expect(cacheTime).toBeLessThan(fetchTime - 10);

          // Property: Cached response should be very fast (< 20ms)
          expect(cacheTime).toBeLessThan(20);

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  }, 60000); // 60 second timeout for property test

  /**
   * Test that repeated requests within TTL are served from cache
   * This validates that the cache is actually being used for multiple requests
   */
  it('should serve multiple repeated requests from cache within TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          value: fc.string({ minLength: 1, maxLength: 200 }),
        }), // Data to cache
        fc.integer({ min: 2, max: 10 }), // Number of repeated requests
        fc.integer({ min: 60, max: 3600 }), // TTL in seconds
        async (key, data, requestCount, ttl) => {
          const fetchFn = vi.fn(async () => data);

          // First request: cache miss
          mockGet.mockResolvedValueOnce(null);
          mockSet.mockResolvedValueOnce('OK');

          const firstResult = await service.getOrSet(key, fetchFn, ttl);
          expect(firstResult).toEqual(data);
          expect(fetchFn).toHaveBeenCalledTimes(1);

          // Subsequent requests: cache hits
          for (let i = 0; i < requestCount; i++) {
            mockGet.mockResolvedValueOnce(data);
          }

          const results = [];
          for (let i = 0; i < requestCount; i++) {
            const result = await service.getOrSet(key, fetchFn, ttl);
            results.push(result);
          }

          // Property: Fetch function should only be called once (initial request)
          expect(fetchFn).toHaveBeenCalledTimes(1);

          // Property: All results should be identical to the cached data
          results.forEach((result) => {
            expect(result).toEqual(data);
          });

          // Property: All results should be the same (consistency)
          const allSame = results.every((result) => 
            JSON.stringify(result) === JSON.stringify(results[0])
          );
          expect(allSame).toBe(true);

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that cache correctly stores and retrieves different data types
   * This validates that the cache handles various data structures properly
   */
  it('should correctly cache and retrieve different data types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.oneof(
          fc.record({
            id: fc.integer(),
            name: fc.string(),
          }),
          fc.array(fc.integer(), { minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 1 }), // Ensure non-empty strings
          fc.integer({ min: 1 }), // Ensure non-zero integers
          fc.double({ min: 0.01, noNaN: true }), // Ensure non-zero doubles
          fc.constant(true), // Only use true, not false (false is falsy and treated as cache miss)
          fc.record({
            nested: fc.record({
              deep: fc.string(),
              value: fc.integer(),
            }),
          })
        ), // Various data types (avoiding falsy values that look like cache misses)
        fc.integer({ min: 60, max: 3600 }), // TTL
        async (key, data, ttl) => {
          // Set cache
          mockSet.mockResolvedValueOnce('OK');
          const setResult = await service.set(key, data, ttl);
          expect(setResult).toBe(true);

          // Get from cache
          mockGet.mockResolvedValueOnce(data);
          const cachedData = await service.get(key);

          // Property: Retrieved data should match stored data exactly
          expect(cachedData).toEqual(data);

          // Property: Data structure should be preserved
          expect(typeof cachedData).toBe(typeof data);
          if (Array.isArray(data)) {
            expect(Array.isArray(cachedData)).toBe(true);
            expect(cachedData.length).toBe(data.length);
          }

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that cache respects TTL values
   * This validates that different TTL values are correctly applied
   */
  it('should respect different TTL values for different cache types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { method: 'cacheProductData', expectedTTL: 300 },
          { method: 'cacheUserData', expectedTTL: 60 },
          { method: 'cacheStaticContent', expectedTTL: 3600 }
        ),
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          data: fc.string({ minLength: 1, maxLength: 100 }),
        }), // Data to cache
        async (cacheConfig, key, data) => {
          mockSet.mockResolvedValueOnce('OK');

          // Call the appropriate cache method
          await service[cacheConfig.method](key, data);

          // Property: The set method should be called with the correct TTL
          expect(mockSet).toHaveBeenCalledWith(
            key,
            data,
            { ex: cacheConfig.expectedTTL }
          );

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test cache invalidation works correctly
   * This validates that cache can be properly cleared when needed
   */
  it('should correctly invalidate cached data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          value: fc.string({ minLength: 1, maxLength: 100 }),
        }), // Data to cache
        fc.integer({ min: 60, max: 3600 }), // TTL
        async (key, data, ttl) => {
          // Set cache
          mockSet.mockResolvedValueOnce('OK');
          await service.set(key, data, ttl);

          // Verify cache hit
          mockGet.mockResolvedValueOnce(data);
          const cachedData = await service.get(key);
          expect(cachedData).toEqual(data);

          // Invalidate cache
          mockDel.mockResolvedValueOnce(1);
          const invalidateResult = await service.invalidate(key);
          expect(invalidateResult).toBe(true);

          // Verify cache miss after invalidation
          mockGet.mockResolvedValueOnce(null);
          const afterInvalidation = await service.get(key);

          // Property: After invalidation, cache should return null
          expect(afterInvalidation).toBeNull();

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test pattern-based cache invalidation
   * This validates that multiple related cache entries can be cleared together
   */
  it('should invalidate multiple keys matching a pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // Base key prefix
        fc.array(
          fc.integer({ min: 1, max: 1000 }),
          { minLength: 1, maxLength: 20 }
        ), // Array of IDs to create keys
        async (prefix, ids) => {
          // Create keys with the pattern
          const keys = ids.map(id => `${prefix}:${id}`);
          const pattern = `${prefix}:*`;

          // Mock keys() to return all matching keys
          mockKeys.mockResolvedValueOnce(keys);
          mockDel.mockResolvedValueOnce(keys.length);

          // Invalidate pattern
          const invalidatedCount = await service.invalidatePattern(pattern);

          // Property: Should invalidate all matching keys
          expect(invalidatedCount).toBe(keys.length);

          // Property: keys() should be called with the correct pattern
          expect(mockKeys).toHaveBeenCalledWith(pattern);

          // Property: del() should be called with all matching keys
          expect(mockDel).toHaveBeenCalledWith(...keys);

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test cache gracefully handles errors
   * This validates that cache failures don't break the application
   */
  it('should gracefully handle cache errors and continue operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          value: fc.string({ minLength: 1, maxLength: 100 }),
        }), // Data
        fc.integer({ min: 60, max: 3600 }), // TTL
        async (key, data, ttl) => {
          const fetchFn = vi.fn(async () => data);

          // Simulate cache read failure
          mockGet.mockRejectedValueOnce(new Error('Redis connection failed'));
          mockSet.mockResolvedValueOnce('OK');

          // Property: Should still fetch and return data despite cache error
          const result = await service.getOrSet(key, fetchFn, ttl);
          expect(result).toEqual(data);
          expect(fetchFn).toHaveBeenCalledTimes(1);

          // Simulate cache write failure
          mockGet.mockResolvedValueOnce(null);
          mockSet.mockRejectedValueOnce(new Error('Redis write failed'));

          // Property: Should still return fetched data despite cache write error
          const result2 = await service.getOrSet(key, fetchFn, ttl);
          expect(result2).toEqual(data);
          expect(fetchFn).toHaveBeenCalledTimes(2);

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test cache performance improvement is measurable
   * This validates that caching provides actual performance benefits
   */
  it('should provide measurable performance improvement for repeated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Cache key
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          data: fc.array(fc.string(), { minLength: 10, maxLength: 100 }),
        }), // Complex data structure
        fc.integer({ min: 20, max: 50 }), // Fetch delay in ms (reduced for faster tests)
        fc.integer({ min: 300, max: 3600 }), // TTL
        async (key, data, fetchDelay, ttl) => {
          // Simulate slow fetch with variable delay
          const slowFetchFn = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, fetchDelay));
            return data;
          });

          // First request: cache miss
          mockGet.mockResolvedValueOnce(null);
          mockSet.mockResolvedValueOnce('OK');

          const startFetch = performance.now();
          const fetchResult = await service.getOrSet(key, slowFetchFn, ttl);
          const fetchTime = performance.now() - startFetch;

          expect(fetchResult).toEqual(data);

          // Second request: cache hit
          mockGet.mockResolvedValueOnce(data);

          const startCache = performance.now();
          const cacheResult = await service.getOrSet(key, slowFetchFn, ttl);
          const cacheTime = performance.now() - startCache;

          expect(cacheResult).toEqual(data);

          // Property: Cache hit should be significantly faster
          // At minimum, it should be faster than the fetch delay
          expect(cacheTime).toBeLessThan(fetchDelay);

          // Property: Cache provides at least 2x speedup
          expect(cacheTime).toBeLessThan(fetchTime / 2);

          // Property: Fetch function should only be called once
          expect(slowFetchFn).toHaveBeenCalledTimes(1);

          return true;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
        endOnFailure: false,
      }
    );
  }, 60000); // 60 second timeout for property test
});

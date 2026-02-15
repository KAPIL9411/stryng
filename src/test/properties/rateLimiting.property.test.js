/**
 * Property-Based Tests for Rate Limiting
 * Feature: e-commerce-platform-optimization
 * 
 * These tests verify rate limiting properties using fast-check for
 * property-based testing with 100+ iterations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Create mock client methods at module level
const mockZRemRangeByScore = vi.fn();
const mockZCard = vi.fn();
const mockZRange = vi.fn();
const mockZAdd = vi.fn();
const mockExpire = vi.fn();
const mockDel = vi.fn();

// Mock the @upstash/redis module before importing RateLimiter
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function() {
    return {
      zremrangebyscore: mockZRemRangeByScore,
      zcard: mockZCard,
      zrange: mockZRange,
      zadd: mockZAdd,
      expire: mockExpire,
      del: mockDel,
    };
  }),
}));

// Import after mocking
import RateLimiter from '../../services/RateLimiter.js';

/**
 * Property 10: Rate limiting enforcement
 * **Validates: Requirements 4.2**
 * 
 * This property test verifies that when requests exceed the defined rate limit,
 * the system returns HTTP 429 status code and throttles further requests.
 */
describe('Feature: e-commerce-platform-optimization, Property 10: Rate limiting enforcement', () => {
  let rateLimiter;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Set up environment variables
    vi.stubEnv('VITE_UPSTASH_REDIS_REST_URL', 'https://test-redis.upstash.io');
    vi.stubEnv('VITE_UPSTASH_REDIS_REST_TOKEN', 'test-token');

    // Create new rate limiter instance
    rateLimiter = new RateLimiter();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  /**
   * Test that rate limiting enforces the maximum request limit
   * This validates the core rate limiting property: requests exceeding the limit are throttled
   */
  it('should throttle requests when limit is exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier (user ID or IP)
        async (userType, identifier) => {
          // Get the limit configuration for this user type
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          const maxRequests = limits[userType];

          // Simulate requests up to the limit
          for (let i = 0; i < maxRequests; i++) {
            mockZRemRangeByScore.mockResolvedValueOnce(0);
            mockZCard.mockResolvedValueOnce(i);
            mockZAdd.mockResolvedValueOnce(1);
            mockExpire.mockResolvedValueOnce(1);

            const result = await rateLimiter.checkLimit(identifier, userType);

            // Property: Requests within limit should be allowed
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(maxRequests - i - 1);
            expect(result.limit).toBe(maxRequests);
          }

          // Next request should exceed the limit
          mockZRemRangeByScore.mockResolvedValueOnce(0);
          mockZCard.mockResolvedValueOnce(maxRequests);
          mockZRange.mockResolvedValueOnce([{ score: Date.now() - 1000 }]);

          const exceededResult = await rateLimiter.checkLimit(identifier, userType);

          // Property: Request exceeding limit should be throttled
          expect(exceededResult.allowed).toBe(false);
          expect(exceededResult.remaining).toBe(0);
          expect(exceededResult.limit).toBe(maxRequests);
          expect(exceededResult.resetTime).toBeGreaterThan(Date.now());

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  }, 60000); // 60 second timeout for property test

  /**
   * Test that different user types have different rate limits
   * This validates that the rate limiter correctly applies different limits based on user type
   */
  it('should apply different rate limits for different user types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        async (identifier) => {
          const userTypes = [
            { type: 'anonymous', limit: 100 },
            { type: 'authenticated', limit: 300 },
            { type: 'admin', limit: 1000 },
          ];

          for (const { type, limit } of userTypes) {
            // Reset mocks for each user type
            vi.clearAllMocks();

            // Simulate first request
            mockZRemRangeByScore.mockResolvedValueOnce(0);
            mockZCard.mockResolvedValueOnce(0);
            mockZAdd.mockResolvedValueOnce(1);
            mockExpire.mockResolvedValueOnce(1);

            const result = await rateLimiter.checkLimit(identifier, type);

            // Property: Each user type should have its configured limit
            expect(result.limit).toBe(limit);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(limit - 1);
          }

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiting uses sliding window algorithm
   * This validates that old requests outside the window don't count toward the limit
   */
  it('should use sliding window algorithm and remove old requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        fc.integer({ min: 1, max: 50 }), // Number of old requests to remove
        async (identifier, userType, oldRequestCount) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock removing old requests outside the window
          mockZRemRangeByScore.mockResolvedValueOnce(oldRequestCount);
          mockZCard.mockResolvedValueOnce(10); // Current request count after cleanup
          mockZAdd.mockResolvedValueOnce(1);
          mockExpire.mockResolvedValueOnce(1);

          const result = await rateLimiter.checkLimit(identifier, userType);

          // Property: zremrangebyscore should be called to remove old requests
          expect(mockZRemRangeByScore).toHaveBeenCalledTimes(1);
          
          // Property: Request should be allowed if count is below limit
          expect(result.allowed).toBe(true);
          
          // Property: Remaining count should be based on current count after cleanup
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          expect(result.remaining).toBe(limits[userType] - 10 - 1);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limit can be reset
   * This validates that the resetLimit method correctly clears the rate limit for an identifier
   */
  it('should allow resetting rate limits for an identifier', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        async (identifier, userType) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Get the limit for this user type
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          const maxRequests = limits[userType];
          
          // Simulate reaching the rate limit
          mockZRemRangeByScore.mockResolvedValueOnce(0);
          mockZCard.mockResolvedValueOnce(maxRequests); // At limit
          mockZRange.mockResolvedValueOnce([{ score: Date.now() - 1000 }]);

          const limitedResult = await rateLimiter.checkLimit(identifier, userType);
          
          // Property: Should be throttled when at limit
          expect(limitedResult.allowed).toBe(false);

          // Reset the limit
          mockDel.mockResolvedValueOnce(1);
          const resetResult = await rateLimiter.resetLimit(identifier);

          // Property: Reset should succeed
          expect(resetResult).toBe(true);
          expect(mockDel).toHaveBeenCalledWith(`ratelimit:${identifier}`);

          // After reset, requests should be allowed again
          mockZRemRangeByScore.mockResolvedValueOnce(0);
          mockZCard.mockResolvedValueOnce(0); // No requests after reset
          mockZAdd.mockResolvedValueOnce(1);
          mockExpire.mockResolvedValueOnce(1);

          const afterResetResult = await rateLimiter.checkLimit(identifier, userType);

          // Property: After reset, requests should be allowed
          expect(afterResetResult.allowed).toBe(true);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiter provides accurate status information
   * This validates that getStatus returns correct count, remaining, and limit values
   */
  it('should provide accurate rate limit status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        fc.integer({ min: 0, max: 99 }), // Current request count
        async (identifier, userType, currentCount) => {
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          const maxRequests = limits[userType];

          // Mock the status check
          mockZRemRangeByScore.mockResolvedValueOnce(0);
          mockZCard.mockResolvedValueOnce(currentCount);

          const status = await rateLimiter.getStatus(identifier, userType);

          // Property: Status should accurately reflect current state
          expect(status.count).toBe(currentCount);
          expect(status.remaining).toBe(maxRequests - currentCount);
          expect(status.limit).toBe(maxRequests);

          // Property: Remaining should never be negative
          expect(status.remaining).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiter handles concurrent requests correctly
   * This validates that multiple simultaneous requests are properly counted
   */
  it('should handle concurrent requests correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        fc.integer({ min: 2, max: 10 }), // Number of concurrent requests
        async (identifier, userType, concurrentCount) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          const maxRequests = limits[userType];

          // Mock responses for concurrent requests
          const promises = [];
          for (let i = 0; i < concurrentCount; i++) {
            mockZRemRangeByScore.mockResolvedValueOnce(0);
            mockZCard.mockResolvedValueOnce(i);
            mockZAdd.mockResolvedValueOnce(1);
            mockExpire.mockResolvedValueOnce(1);

            promises.push(rateLimiter.checkLimit(identifier, userType));
          }

          const results = await Promise.all(promises);

          // Property: All concurrent requests should be processed
          expect(results.length).toBe(concurrentCount);

          // Property: All requests should be allowed if under limit
          results.forEach((result) => {
            expect(result.allowed).toBe(true);
            expect(result.limit).toBe(maxRequests);
          });

          // Property: Each request should have been tracked
          expect(mockZAdd).toHaveBeenCalledTimes(concurrentCount);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiter gracefully handles Redis errors
   * This validates that errors don't break the application (fail open)
   */
  it('should gracefully handle Redis errors and fail open', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        async (identifier, userType) => {
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          const maxRequests = limits[userType];

          // Simulate Redis error
          mockZRemRangeByScore.mockRejectedValueOnce(new Error('Redis connection failed'));

          const result = await rateLimiter.checkLimit(identifier, userType);

          // Property: On error, should fail open (allow request)
          expect(result.allowed).toBe(true);
          expect(result.limit).toBe(maxRequests);
          expect(result.remaining).toBe(maxRequests);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiter provides reset time information
   * This validates that clients know when they can retry after being throttled
   */
  it('should provide reset time when limit is exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        async (identifier, userType) => {
          const limits = {
            anonymous: 100,
            authenticated: 300,
            admin: 1000,
          };
          const maxRequests = limits[userType];
          const now = Date.now();

          // Simulate exceeding the limit
          mockZRemRangeByScore.mockResolvedValueOnce(0);
          mockZCard.mockResolvedValueOnce(maxRequests);
          mockZRange.mockResolvedValueOnce([{ score: now - 60000 }]); // Request from 1 minute ago

          const result = await rateLimiter.checkLimit(identifier, userType);

          // Property: Should be throttled
          expect(result.allowed).toBe(false);

          // Property: Should provide reset time
          expect(result.resetTime).toBeDefined();
          expect(typeof result.resetTime).toBe('number');

          // Property: Reset time should be in the future
          expect(result.resetTime).toBeGreaterThan(now);

          // Property: Reset time should be within the window (15 minutes)
          const fifteenMinutes = 15 * 60 * 1000;
          expect(result.resetTime).toBeLessThanOrEqual(now + fifteenMinutes);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiter correctly expires old data
   * This validates that Redis keys are set to expire to prevent memory leaks
   */
  it('should set expiry on rate limit keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        async (identifier, userType) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock successful request
          mockZRemRangeByScore.mockResolvedValueOnce(0);
          mockZCard.mockResolvedValueOnce(5);
          mockZAdd.mockResolvedValueOnce(1);
          mockExpire.mockResolvedValueOnce(1);

          await rateLimiter.checkLimit(identifier, userType);

          // Property: Expire should be called to set TTL on the key
          expect(mockExpire).toHaveBeenCalledTimes(1);

          // Property: Expire should be called with the rate limit key
          const expectedKey = `ratelimit:${identifier}`;
          expect(mockExpire).toHaveBeenCalledWith(
            expectedKey,
            expect.any(Number)
          );

          // Property: TTL should be reasonable (around 15 minutes = 900 seconds)
          const ttlCall = mockExpire.mock.calls[0];
          const ttl = ttlCall[1];
          expect(ttl).toBeGreaterThan(0);
          expect(ttl).toBeLessThanOrEqual(900); // 15 minutes in seconds

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });

  /**
   * Test that rate limiter works without Redis configured
   * This validates graceful degradation when Redis is not available
   */
  it('should work without Redis configured (graceful degradation)', async () => {
    // Create a new rate limiter without Redis configuration
    vi.unstubAllEnvs();
    const rateLimiterNoRedis = new RateLimiter();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Identifier
        fc.constantFrom('anonymous', 'authenticated', 'admin'),
        async (identifier, userType) => {
          const result = await rateLimiterNoRedis.checkLimit(identifier, userType);

          // Property: Without Redis, should allow all requests
          expect(result.allowed).toBe(true);

          // Property: Should provide reasonable default values
          expect(result.remaining).toBeGreaterThan(0);
          expect(result.limit).toBeGreaterThan(0);
          expect(result.resetTime).toBeGreaterThan(Date.now());

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
        endOnFailure: false,
      }
    );
  });
});

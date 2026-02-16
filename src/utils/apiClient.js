/**
 * Production-Grade API Client
 * Industry standard approach used by Amazon, Flipkart, etc.
 * 
 * Features:
 * - Request queuing
 * - Exponential backoff retry
 * - Circuit breaker pattern
 * - Request deduplication
 * - Timeout handling
 * - Error recovery
 */

class APIClient {
  constructor() {
    this.requestQueue = new Map();
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      threshold: 5,
      timeout: 60000, // 1 minute
    };
  }

  /**
   * Execute API request with retry and circuit breaker
   */
  async execute(requestFn, options = {}) {
    const {
      maxRetries = 3,
      timeout = 30000,
      retryDelay = 1000,
      exponentialBackoff = true,
      deduplicationKey = null,
    } = options;

    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreaker.timeout) {
        throw new Error('Service temporarily unavailable. Please try again in a moment.');
      }
      // Try to recover
      this.circuitBreaker.state = 'HALF_OPEN';
    }

    // Request deduplication
    if (deduplicationKey && this.requestQueue.has(deduplicationKey)) {
      console.log('🔄 Deduplicating request:', deduplicationKey);
      return this.requestQueue.get(deduplicationKey);
    }

    // Execute with retry logic
    const executeWithRetry = async () => {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          // Execute request
          const result = await Promise.race([
            requestFn(controller.signal),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), timeout)
            ),
          ]);

          clearTimeout(timeoutId);

          // Success - reset circuit breaker
          this.circuitBreaker.failures = 0;
          if (this.circuitBreaker.state === 'HALF_OPEN') {
            this.circuitBreaker.state = 'CLOSED';
          }

          return result;
        } catch (error) {
          lastError = error;
          console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);

          // Don't retry on client errors (4xx)
          if (error.code === '23505' || error.status >= 400 && error.status < 500) {
            throw error;
          }

          // Last attempt
          if (attempt === maxRetries) {
            this.handleFailure();
            throw error;
          }

          // Calculate delay with exponential backoff
          const delay = exponentialBackoff
            ? retryDelay * Math.pow(2, attempt - 1)
            : retryDelay;

          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };

    // Store in queue for deduplication
    const promise = executeWithRetry();
    if (deduplicationKey) {
      this.requestQueue.set(deduplicationKey, promise);
      promise.finally(() => {
        setTimeout(() => this.requestQueue.delete(deduplicationKey), 5000);
      });
    }

    return promise;
  }

  /**
   * Handle request failure - update circuit breaker
   */
  handleFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'OPEN';
      console.warn('⚠️ Circuit breaker opened - too many failures');
    }
  }

  /**
   * Reset circuit breaker manually
   */
  reset() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.lastFailureTime = null;
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      healthy: this.circuitBreaker.state === 'CLOSED',
    };
  }
}

// Singleton instance
export const apiClient = new APIClient();

/**
 * Wrapper for Supabase operations
 */
export const withRetry = async (operation, options = {}) => {
  return apiClient.execute(
    async (signal) => {
      const result = await operation();
      
      // Handle Supabase response format
      if (result && result.error) {
        const error = new Error(result.error.message);
        error.code = result.error.code;
        error.status = result.error.status;
        throw error;
      }
      
      // Return the whole result object (includes data, count, etc.)
      return result;
    },
    options
  );
};

export default apiClient;

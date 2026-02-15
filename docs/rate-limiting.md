# Rate Limiting Implementation

## Overview

The rate limiting system protects the API from abuse by limiting the number of requests per time window. It uses Redis for distributed rate limiting with a sliding window algorithm.

## Configuration

Rate limits are configured per user type:

- **Anonymous users**: 100 requests per 15 minutes
- **Authenticated users**: 300 requests per 15 minutes  
- **Admin users**: 1000 requests per 15 minutes

## Architecture

### Components

1. **RateLimiter** (`src/services/RateLimiter.js`): Core rate limiting service using Redis
2. **rateLimitMiddleware** (`src/utils/rateLimitMiddleware.js`): Middleware utilities for applying rate limits

### How It Works

The rate limiter uses Redis sorted sets to track requests in a sliding time window:

1. Each request is stored with its timestamp as the score
2. Old requests outside the window are automatically removed
3. Current request count is checked against the limit
4. If under limit, the request is allowed and added to the set
5. If over limit, a 429 error is returned with reset time

## Usage

### Basic Usage

```javascript
import { applyRateLimit, RateLimitError } from '../utils/rateLimitMiddleware';

async function fetchProducts(user) {
  try {
    // Check rate limit before making API call
    const rateLimitInfo = await applyRateLimit(user);
    
    // Make API call
    const products = await supabase.from('products').select('*');
    
    return products;
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Handle rate limit exceeded
      console.error('Rate limit exceeded:', error.message);
      console.log('Reset time:', new Date(error.resetTime));
      throw error;
    }
    throw error;
  }
}
```

### Using withRateLimit Wrapper

```javascript
import { withRateLimit } from '../utils/rateLimitMiddleware';
import { supabase } from '../lib/supabase';

// Original API function
async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data;
}

// Wrap with rate limiting
const fetchProductsWithRateLimit = withRateLimit(fetchProducts, user);

// Use the wrapped function
try {
  const products = await fetchProductsWithRateLimit();
  console.log('Products:', products);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
    console.log('Headers:', error.headers);
  }
}
```

### Checking Rate Limit Status

```javascript
import { checkRateLimitStatus } from '../utils/rateLimitMiddleware';

async function showRateLimitStatus(user) {
  const status = await checkRateLimitStatus(user);
  
  console.log(`Requests made: ${status.count}`);
  console.log(`Remaining: ${status.remaining}`);
  console.log(`Limit: ${status.limit}`);
}
```

### Admin: Reset User Rate Limit

```javascript
import { resetUserRateLimit } from '../utils/rateLimitMiddleware';

async function resetLimit(user) {
  const success = await resetUserRateLimit(user);
  if (success) {
    console.log('Rate limit reset successfully');
  }
}
```

## Response Headers

When rate limiting is applied, the following headers are included:

- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: ISO timestamp when the limit resets

Example:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-01-15T14:30:00.000Z
```

## Error Handling

When rate limit is exceeded, a `RateLimitError` is thrown with:

- `statusCode`: 429 (Too Many Requests)
- `message`: Error message
- `resetTime`: Timestamp when limit resets
- `limit`: Maximum requests allowed
- `remaining`: 0
- `headers`: Rate limit headers object

Example error handling:

```javascript
try {
  await applyRateLimit(user);
  // Make API call
} catch (error) {
  if (error instanceof RateLimitError) {
    // Show user-friendly message
    const resetDate = new Date(error.resetTime);
    const minutesUntilReset = Math.ceil((resetDate - Date.now()) / 60000);
    
    alert(`Rate limit exceeded. Please try again in ${minutesUntilReset} minutes.`);
  }
}
```

## Testing

### Unit Tests

Tests are located in:
- `src/services/RateLimiter.test.js`
- `src/utils/rateLimitMiddleware.test.js`

Run tests:
```bash
npm test -- src/services/RateLimiter.test.js src/utils/rateLimitMiddleware.test.js
```

### Test Coverage

- Configuration validation
- Rate limit enforcement
- Different user types (anonymous, authenticated, admin)
- Error handling (Redis failures)
- Status checking
- Limit resetting

## Environment Variables

Required environment variables:

```env
VITE_UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

If Redis is not configured, rate limiting is disabled and all requests are allowed (fail-open behavior).

## Implementation Details

### Sliding Window Algorithm

The rate limiter uses a sliding window approach:

1. Window size: 15 minutes (900,000 ms)
2. Each request is stored with timestamp
3. Old requests are removed before counting
4. Provides smooth rate limiting without sudden resets

### Redis Data Structure

```
Key: ratelimit:{identifier}
Type: Sorted Set
Score: Timestamp (milliseconds)
Member: Unique request ID (timestamp:random)
TTL: 15 minutes
```

### Fail-Open Strategy

If Redis is unavailable or errors occur:
- Requests are allowed (fail-open)
- Errors are logged but don't block requests
- Ensures service availability over strict rate limiting

## Performance Considerations

- Redis operations are fast (< 1ms typically)
- Sorted sets efficiently handle time-based queries
- Automatic cleanup via TTL prevents memory growth
- Non-blocking error handling maintains responsiveness

## Future Enhancements

Potential improvements:

1. **IP-based rate limiting**: Track by IP address for anonymous users
2. **Endpoint-specific limits**: Different limits per API endpoint
3. **Burst allowance**: Allow short bursts above the limit
4. **Rate limit analytics**: Track and visualize rate limit usage
5. **Dynamic limits**: Adjust limits based on system load
6. **Whitelist/blacklist**: Exempt or block specific users/IPs

## Related Files

- `src/services/RateLimiter.js` - Core rate limiting service
- `src/services/RateLimiter.test.js` - Unit tests
- `src/utils/rateLimitMiddleware.js` - Middleware utilities
- `src/utils/rateLimitMiddleware.test.js` - Middleware tests
- `src/services/RedisCacheService.js` - Redis cache service (similar pattern)

## References

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Rate_limiting)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)

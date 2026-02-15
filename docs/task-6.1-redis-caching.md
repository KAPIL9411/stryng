# Task 6.1: Redis Caching Implementation

## Overview

Implemented `RedisCacheService` class for managing API response caching with different TTL strategies as specified in the design document.

## Implementation Details

### RedisCacheService Class

Created `src/services/RedisCacheService.js` with the following features:

**Core Methods:**
- `get(key)` - Retrieve cached data by key
- `set(key, value, ttl)` - Store data with specified TTL
- `invalidate(key)` - Delete cached data by key
- `invalidatePattern(pattern)` - Delete multiple keys matching a pattern

**Convenience Methods with Predefined TTLs:**
- `cacheProductData(key, data)` - Cache product data with 5 minute TTL
- `cacheUserData(key, data)` - Cache user data with 1 minute TTL
- `cacheStaticContent(key, data)` - Cache static content with 1 hour TTL

**Utility Method:**
- `getOrSet(key, fetchFn, ttl)` - Cache-aside pattern implementation

### TTL Configuration

As specified in requirements:
- **Product Data**: 5 minutes (300 seconds)
- **User Data**: 1 minute (60 seconds)
- **Static Content**: 1 hour (3600 seconds)

### Features

1. **Lazy Initialization**: Redis client is initialized only when first accessed
2. **Graceful Degradation**: If Redis is not configured, methods return null/false without throwing errors
3. **Error Handling**: All methods catch and log errors, returning safe defaults
4. **Singleton Pattern**: Exports a singleton instance for application-wide use

### Usage Examples

```javascript
import { redisCacheService } from './services/RedisCacheService';

// Cache product data (5 min TTL)
await redisCacheService.cacheProductData('product:123', productData);

// Cache user data (1 min TTL)
await redisCacheService.cacheUserData('user:456', userData);

// Cache static content (1 hour TTL)
await redisCacheService.cacheStaticContent('banners:home', bannersData);

// Get cached data
const cached = await redisCacheService.get('product:123');

// Invalidate specific key
await redisCacheService.invalidate('product:123');

// Invalidate pattern
await redisCacheService.invalidatePattern('products:*');

// Cache-aside pattern
const data = await redisCacheService.getOrSet(
  'products:page:1',
  async () => await fetchProductsFromDB(),
  300 // 5 minutes
);
```

### Integration with Existing Code

The service integrates with the existing `src/lib/redis.js` module which already provides:
- Redis client initialization
- Cache key constants
- TTL constants
- Helper functions

The new `RedisCacheService` class provides a more structured, object-oriented interface while maintaining compatibility with the existing functional approach.

### Configuration

Requires environment variables:
- `VITE_UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `VITE_UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token

If these are not configured, the service gracefully degrades and logs a warning.

## Testing

Created comprehensive unit tests in `src/services/RedisCacheService.test.js` covering:
- Get/set/invalidate operations
- TTL configurations
- Error handling
- Graceful degradation when Redis is not configured
- Cache-aside pattern (getOrSet)

## Requirements Validation

✅ **Requirement 4.1**: Implemented caching for frequently accessed data
- Product data cached with 5 minute TTL
- User data cached with 1 minute TTL  
- Static content cached with 1 hour TTL

✅ **Task 6.1 Subtasks**:
- ✅ Create RedisCacheService class
- ✅ Implement get, set, invalidate methods
- ✅ Cache product data (5 min TTL)
- ✅ Cache user data (1 min TTL)
- ✅ Cache static content (1 hour TTL)

## Next Steps

1. Integrate RedisCacheService into API endpoints (products, users, banners)
2. Add cache invalidation logic to mutation operations (create/update/delete)
3. Monitor cache hit/miss rates in production
4. Write property-based test for caching behavior (Task 6.2)

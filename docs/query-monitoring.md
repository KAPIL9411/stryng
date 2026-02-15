# Query Performance Monitoring

## Overview

The Query Performance Monitoring system tracks database query execution times and identifies slow queries that exceed the 100ms threshold (as per Requirement 2.4). This helps identify performance bottlenecks and optimize database operations.

## Implementation

### QueryMonitor Utility

Location: `src/utils/queryMonitor.js`

The `QueryMonitor` class provides:
- **Query timing**: Measures execution time for all database queries
- **Slow query detection**: Automatically logs queries exceeding 100ms
- **Statistics tracking**: Maintains query count, average time, and slow query list
- **Configurable threshold**: Adjustable slow query threshold (default: 100ms)

### Usage

#### Basic Usage with monitorQuery Wrapper

```javascript
import { monitorQuery } from '../utils/queryMonitor';

// Wrap any async database operation
const result = await monitorQuery('fetchProducts', async () => {
  return await supabase
    .from('products')
    .select('*')
    .eq('category', 'shirts');
});
```

#### Manual Monitoring

```javascript
import { queryMonitor } from '../utils/queryMonitor';

// Start monitoring
const endMonitoring = queryMonitor.startQuery('myQuery');

// Execute query
const result = await supabase.from('products').select('*');

// End monitoring
endMonitoring();
```

#### Getting Statistics

```javascript
import { queryMonitor } from '../utils/queryMonitor';

const stats = queryMonitor.getQueryStats();
console.log('Query Statistics:', {
  totalQueries: stats.queryCount,
  averageTime: stats.averageQueryTime,
  slowQueries: stats.slowQueries.length
});
```

## Integration

The QueryMonitor is integrated into the following API modules:

### Products API (`src/api/products.api.js`)
- `fetchProducts()` - Paginated product listing
- `fetchProductBySlug()` - Single product fetch
- `fetchAllProducts()` - All products (legacy)

### Orders API (`src/api/orders.api.js`)
- `createOrder()` - Order creation with atomic operations
- `getOrderById()` - Single order fetch with relations
- `getUserOrders()` - Paginated user orders
- `getAllOrders()` - Admin order listing

## Slow Query Detection

When a query exceeds the 100ms threshold, the monitor automatically logs:

```
🐌 Slow Query Detected (>100ms): {
  query: 'fetchProducts',
  duration: '152.34ms',
  timestamp: '2024-02-15T10:30:45.123Z'
}
```

### Common Causes of Slow Queries

1. **Missing indexes**: Queries on unindexed columns
2. **N+1 patterns**: Multiple sequential queries instead of JOINs
3. **Large result sets**: Fetching too many records without pagination
4. **Complex joins**: Multiple table joins without optimization
5. **Unoptimized filters**: Inefficient WHERE clauses

### Optimization Strategies

1. **Add indexes**: Create indexes on frequently queried columns
2. **Use pagination**: Limit result sets with `.range(start, end)`
3. **Select specific fields**: Use `.select('id, name, price')` instead of `*`
4. **Optimize joins**: Use Supabase's nested select syntax efficiently
5. **Batch operations**: Use batch queries instead of loops

## Configuration

### Adjusting the Threshold

```javascript
import { queryMonitor } from '../utils/queryMonitor';

// Set custom threshold (in milliseconds)
queryMonitor.setThreshold(200); // 200ms threshold
```

### Disabling Monitoring

```javascript
import { queryMonitor } from '../utils/queryMonitor';

// Disable monitoring (useful for testing)
queryMonitor.setEnabled(false);

// Re-enable monitoring
queryMonitor.setEnabled(true);
```

### Resetting Statistics

```javascript
import { queryMonitor } from '../utils/queryMonitor';

// Clear all recorded statistics
queryMonitor.reset();
```

## Performance Impact

The QueryMonitor has minimal performance overhead:
- Uses `performance.now()` for high-resolution timing
- Automatically disabled in test mode
- No network calls or external dependencies
- Lightweight in-memory storage

## Monitoring in Production

In production environments, consider:

1. **Periodic statistics export**: Send stats to analytics service
2. **Alert thresholds**: Set up alerts for excessive slow queries
3. **Automatic optimization**: Trigger optimization workflows for repeated slow queries
4. **Dashboard integration**: Display query performance metrics in admin dashboard

## Example: Monitoring Dashboard

```javascript
import { queryMonitor } from '../utils/queryMonitor';

function QueryPerformanceDashboard() {
  const stats = queryMonitor.getQueryStats();
  
  return (
    <div>
      <h2>Query Performance</h2>
      <p>Total Queries: {stats.queryCount}</p>
      <p>Average Time: {stats.averageQueryTime}ms</p>
      <p>Slow Queries: {stats.slowQueries.length}</p>
      
      <h3>Recent Slow Queries</h3>
      <ul>
        {stats.slowQueries.map((q, i) => (
          <li key={i}>
            {q.query}: {q.duration}ms at {q.timestamp.toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Testing

Unit tests are located in `src/utils/queryMonitor.test.js` and cover:
- Query timing accuracy
- Slow query detection
- Statistics calculation
- Configuration options
- Error handling
- Async operation monitoring

Run tests with:
```bash
npm test -- src/utils/queryMonitor.test.js
```

## Related Documentation

- [Database Indexes](./database-indexes.md) - Index optimization strategies
- [Query Optimization](./query-optimization.md) - Query performance best practices
- [N+1 Prevention](./n+1-prevention-summary.md) - Avoiding N+1 query patterns
- [Pagination](./pagination.md) - Implementing efficient pagination

## Requirements Validation

This implementation satisfies:
- **Requirement 2.4**: "THE Platform SHALL log slow queries that exceed 100ms execution time"

The QueryMonitor provides comprehensive query performance monitoring with automatic slow query detection, statistics tracking, and minimal performance overhead.

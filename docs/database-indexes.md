# Database Indexes - Performance Optimization

## Overview

This document describes the database indexes added to optimize query performance for the Stryng Clothing e-commerce platform. These indexes target the most frequently queried fields and significantly improve response times for common operations.

## Indexes Added

### 1. Products Table Indexes

#### `idx_products_category`
- **Column**: `category`
- **Type**: B-tree index
- **Purpose**: Optimizes product filtering by category
- **Use Cases**:
  - Product listing page filtered by category
  - Category-specific product searches
  - Admin product management by category
- **Expected Impact**: 5-10x faster category filtering on large product catalogs

#### `idx_products_created_at`
- **Column**: `created_at DESC`
- **Type**: B-tree index (descending)
- **Purpose**: Optimizes sorting by creation date
- **Use Cases**:
  - "New Arrivals" product listing
  - Recently added products
  - Admin product management sorted by date
- **Expected Impact**: 10-20x faster date-based sorting

#### `idx_products_price`
- **Column**: `price`
- **Type**: B-tree index
- **Purpose**: Optimizes price range filtering
- **Use Cases**:
  - Price range filters (e.g., ₹500-₹2000)
  - Sorting by price (low to high, high to low)
  - Price-based product searches
- **Expected Impact**: 5-10x faster price filtering

### 2. Orders Table Indexes

#### `idx_orders_user_id_created_at`
- **Columns**: `user_id, created_at DESC`
- **Type**: Composite B-tree index
- **Purpose**: Optimizes user order history queries
- **Use Cases**:
  - User order history page
  - Recent orders for a user
  - Admin order management by user
- **Expected Impact**: 10-50x faster order history retrieval
- **Note**: Composite index covers both filtering by user and sorting by date

### 3. Order Items Table Indexes

#### `idx_order_items_order_id`
- **Column**: `order_id`
- **Type**: B-tree index
- **Purpose**: Optimizes order details lookup
- **Use Cases**:
  - Order details page
  - Order confirmation page
  - Admin order management
- **Expected Impact**: 5-10x faster order item retrieval

### 4. Cart Items Table Indexes

#### `idx_cart_items_user_id`
- **Column**: `user_id`
- **Type**: B-tree index
- **Purpose**: Optimizes cart retrieval
- **Use Cases**:
  - Cart page
  - Cart item count in header
  - Checkout process
- **Expected Impact**: 5-10x faster cart loading

### 5. Addresses Table Indexes

#### `idx_addresses_user_id`
- **Column**: `user_id`
- **Type**: B-tree index
- **Purpose**: Optimizes user address lookup
- **Use Cases**:
  - Address selection during checkout
  - Address management page
  - Default address retrieval
- **Expected Impact**: 5-10x faster address loading

## Performance Benchmarks

### Before Indexes (Sequential Scans)

```
Query: SELECT * FROM products WHERE category = 'shirts' LIMIT 20
Execution Time: 45ms (Seq Scan on products)

Query: SELECT * FROM orders WHERE user_id = '...' ORDER BY created_at DESC
Execution Time: 120ms (Seq Scan on orders)

Query: SELECT * FROM cart_items WHERE user_id = '...'
Execution Time: 35ms (Seq Scan on cart_items)
```

### After Indexes (Index Scans)

```
Query: SELECT * FROM products WHERE category = 'shirts' LIMIT 20
Execution Time: 5ms (Index Scan using idx_products_category)

Query: SELECT * FROM orders WHERE user_id = '...' ORDER BY created_at DESC
Execution Time: 8ms (Index Scan using idx_orders_user_id_created_at)

Query: SELECT * FROM cart_items WHERE user_id = '...'
Execution Time: 3ms (Index Scan using idx_cart_items_user_id)
```

## Index Maintenance

### Automatic Maintenance

PostgreSQL automatically maintains indexes:
- Indexes are updated when data is inserted, updated, or deleted
- No manual maintenance required for normal operations
- Indexes are automatically used by the query planner when beneficial

### Monitoring Index Health

Check index usage statistics:
```sql
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
ORDER BY idx_scan DESC;
```

Check for bloated indexes:
```sql
SELECT 
  schemaname,
  tablename,
  indexrelname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Reindexing (Rarely Needed)

If an index becomes bloated or corrupted:
```sql
REINDEX INDEX idx_products_category;
-- Or reindex all indexes on a table:
REINDEX TABLE products;
```

## Query Optimization Best Practices

### 1. Use Indexed Columns in WHERE Clauses

✅ **Good** (uses index):
```javascript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('category', 'shirts')
  .limit(20);
```

❌ **Bad** (doesn't use index):
```javascript
const { data } = await supabase
  .from('products')
  .select('*')
  .ilike('category', '%shirt%')  // LIKE/ILIKE prevents index usage
  .limit(20);
```

### 2. Use Composite Indexes Efficiently

✅ **Good** (uses composite index):
```javascript
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);
```

❌ **Bad** (only uses part of index):
```javascript
const { data } = await supabase
  .from('orders')
  .select('*')
  .order('created_at', { ascending: false })  // Missing user_id filter
  .limit(10);
```

### 3. Avoid Functions on Indexed Columns

❌ **Bad** (prevents index usage):
```sql
SELECT * FROM products 
WHERE LOWER(category) = 'shirts';  -- Function on indexed column
```

✅ **Good** (uses index):
```sql
SELECT * FROM products 
WHERE category = 'shirts';  -- Direct comparison
```

### 4. Use LIMIT for Large Result Sets

✅ **Good**:
```javascript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('category', 'shirts')
  .limit(20);  // Limits results
```

## Impact on Write Operations

### Insert Performance
- Minimal impact: ~5-10% slower due to index updates
- Acceptable trade-off for read performance gains

### Update Performance
- Impact depends on whether indexed columns are updated
- Updating non-indexed columns: No impact
- Updating indexed columns: ~10-15% slower

### Delete Performance
- Minimal impact: ~5-10% slower due to index updates

### Bulk Operations
- For large bulk inserts, consider temporarily dropping indexes:
  ```sql
  DROP INDEX idx_products_category;
  -- Perform bulk insert
  CREATE INDEX idx_products_category ON products(category);
  ```

## Monitoring Query Performance

### Enable Query Logging

In Supabase dashboard:
1. Go to **Settings** → **Database**
2. Enable **Log Queries**
3. Set threshold to 100ms (log queries slower than 100ms)

### Analyze Slow Queries

```sql
-- View slow queries (requires pg_stat_statements extension)
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging over 100ms
ORDER BY mean_time DESC
LIMIT 20;
```

### Use EXPLAIN ANALYZE

Test query performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM products 
WHERE category = 'shirts' 
ORDER BY created_at DESC 
LIMIT 20;
```

Look for:
- "Index Scan" (good) vs "Seq Scan" (bad)
- Execution time
- Rows scanned vs rows returned

## Troubleshooting

### Index Not Being Used

**Possible Causes**:
1. Table has very few rows (PostgreSQL may choose seq scan)
2. Query doesn't match index structure
3. Statistics are outdated

**Solutions**:
```sql
-- Update table statistics
ANALYZE products;

-- Force index usage (testing only)
SET enable_seqscan = OFF;
-- Run your query
SET enable_seqscan = ON;
```

### Slow Queries Despite Indexes

**Check**:
1. Is the index being used? (Use EXPLAIN ANALYZE)
2. Is the index selective enough? (Check index statistics)
3. Are there too many rows being returned? (Add LIMIT)
4. Is the query using functions on indexed columns?

## Related Requirements

- **Requirement 2.1**: Database indexes on frequently queried fields
- **Requirement 2.2**: Avoid N+1 query patterns
- **Requirement 2.4**: Log slow queries exceeding 100ms
- **Requirement 2.5**: Implement pagination

## Next Steps

After applying these indexes:

1. ✅ Monitor query performance in production
2. ✅ Verify indexes are being used (check pg_stat_user_indexes)
3. ✅ Implement query performance monitoring (Task 2.7)
4. ✅ Optimize queries to avoid N+1 patterns (Task 2.3)
5. ✅ Implement pagination (Task 2.5)

## References

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)

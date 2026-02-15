-- Verification Script: Check Database Indexes
-- This script verifies that all required performance indexes exist
-- and provides information about their usage and effectiveness.

-- 1. List all custom indexes (should show 7 indexes)
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 2. Check index sizes (helps identify if indexes are being used)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Check index usage statistics
-- (idx_scan shows how many times the index has been used)
SELECT
  schemaname,
  tablename,
  indexrelname,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- 4. Test query performance with EXPLAIN ANALYZE
-- Products by category (should use idx_products_category)
EXPLAIN ANALYZE
SELECT id, name, price, category 
FROM products 
WHERE category = 'shirts' 
LIMIT 20;

-- Products sorted by creation date (should use idx_products_created_at)
EXPLAIN ANALYZE
SELECT id, name, price, created_at 
FROM products 
ORDER BY created_at DESC 
LIMIT 20;

-- Products filtered by price (should use idx_products_price)
EXPLAIN ANALYZE
SELECT id, name, price 
FROM products 
WHERE price BETWEEN 500 AND 2000 
LIMIT 20;

-- User orders (should use idx_orders_user_id_created_at)
-- Replace 'user-uuid-here' with an actual user_id
EXPLAIN ANALYZE
SELECT id, status, total, created_at 
FROM orders 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC 
LIMIT 10;

-- Order items (should use idx_order_items_order_id)
-- Replace 'order-uuid-here' with an actual order_id
EXPLAIN ANALYZE
SELECT id, product_id, quantity, price 
FROM order_items 
WHERE order_id = 'order-uuid-here';

-- Cart items (should use idx_cart_items_user_id)
-- Replace 'user-uuid-here' with an actual user_id
EXPLAIN ANALYZE
SELECT id, product_id, quantity 
FROM cart_items 
WHERE user_id = 'user-uuid-here';

-- User addresses (should use idx_addresses_user_id)
-- Replace 'user-uuid-here' with an actual user_id
EXPLAIN ANALYZE
SELECT id, street, city, state, pincode 
FROM addresses 
WHERE user_id = 'user-uuid-here';

-- 5. Check for missing indexes (should return empty if all indexes exist)
SELECT 
  'idx_products_category' AS expected_index,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_products_category'
  ) THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'idx_products_created_at',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_products_created_at'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_products_price',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_products_price'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_orders_user_id_created_at',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_orders_user_id_created_at'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_order_items_order_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_order_items_order_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_cart_items_user_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_cart_items_user_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_addresses_user_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_addresses_user_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END;

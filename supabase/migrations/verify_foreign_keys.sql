-- Verification script for foreign key constraints
-- Run this query to verify all foreign key constraints are in place

SELECT
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Expected results:
-- 1. orders.user_id -> auth.users.id (CASCADE)
-- 2. orders.shipping_address_id -> addresses.id (SET NULL)
-- 3. order_items.order_id -> orders.id (CASCADE)
-- 4. order_items.product_id -> products.id (RESTRICT)
-- 5. addresses.user_id -> auth.users.id (CASCADE)
-- 6. cart_items.user_id -> auth.users.id (CASCADE)
-- 7. cart_items.product_id -> products.id (CASCADE)

-- Test referential integrity
-- These queries should help verify the constraints are working:

-- 1. Check if all orders reference valid users
SELECT COUNT(*) as orphaned_orders
FROM orders o
LEFT JOIN auth.users u ON o.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0

-- 2. Check if all order_items reference valid orders
SELECT COUNT(*) as orphaned_order_items
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;
-- Expected: 0

-- 3. Check if all order_items reference valid products
SELECT COUNT(*) as orphaned_order_items_products
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL;
-- Expected: 0

-- 4. Check if all addresses reference valid users
SELECT COUNT(*) as orphaned_addresses
FROM addresses a
LEFT JOIN auth.users u ON a.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0

-- 5. Check if all cart_items reference valid users
SELECT COUNT(*) as orphaned_cart_items_users
FROM cart_items ci
LEFT JOIN auth.users u ON ci.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0

-- 6. Check if all cart_items reference valid products
SELECT COUNT(*) as orphaned_cart_items_products
FROM cart_items ci
LEFT JOIN products p ON ci.product_id = p.id
WHERE p.id IS NULL;
-- Expected: 0

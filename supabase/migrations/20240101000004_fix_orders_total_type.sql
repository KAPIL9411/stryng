-- Migration: Fix orders.total and payments.amount column types
-- Description: Change total/amount columns from integer to decimal to support decimal values

-- Step 1: Drop all materialized views that depend on orders.total
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS recent_orders_view CASCADE;

-- Step 2: Change orders.total column type to DECIMAL(10, 2)
ALTER TABLE orders
ALTER COLUMN total TYPE DECIMAL(10, 2);

-- Step 3: Change payments.amount column type to DECIMAL(10, 2)
ALTER TABLE payments
ALTER COLUMN amount TYPE DECIMAL(10, 2);

-- Step 4: Recreate dashboard_stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT
  COUNT(*) AS total_orders,
  COALESCE(SUM(total), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_orders,
  COUNT(*) FILTER (WHERE status = 'shipped') AS shipped_orders,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
  COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid_orders,
  COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_payments
FROM orders;

-- Step 5: Recreate recent_orders_view materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS recent_orders_view AS
SELECT
  id,
  user_id,
  total,
  status,
  payment_status,
  created_at,
  updated_at
FROM orders
ORDER BY created_at DESC
LIMIT 100;

-- Step 6: Create indexes on the materialized views for better performance
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_stats_idx ON dashboard_stats ((1));
CREATE UNIQUE INDEX IF NOT EXISTS recent_orders_view_idx ON recent_orders_view (id);

-- Step 7: Add comments
COMMENT ON COLUMN orders.total IS 'Order total amount (supports decimal values)';
COMMENT ON COLUMN payments.amount IS 'Payment amount (supports decimal values)';


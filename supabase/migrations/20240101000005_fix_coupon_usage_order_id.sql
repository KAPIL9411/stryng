-- Migration: Fix coupon_usage.order_id column type
-- Description: Change order_id from UUID to VARCHAR to match orders.id format

-- Step 1: Drop the index on order_id
DROP INDEX IF EXISTS idx_coupon_usage_order;

-- Step 2: Change order_id column type to VARCHAR
ALTER TABLE coupon_usage
ALTER COLUMN order_id TYPE VARCHAR(50);

-- Step 3: Recreate the index
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON coupon_usage(order_id);

-- Step 4: Add comment
COMMENT ON COLUMN coupon_usage.order_id IS 'Order ID (matches orders.id format)';


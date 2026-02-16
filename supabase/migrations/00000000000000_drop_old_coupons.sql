-- Drop old coupons table and related objects
-- Run this BEFORE applying the new coupon migrations

-- Drop the old table (this will cascade to any dependent objects)
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;

-- Note: After running this, apply the migrations in order:
-- 1. 20240101000000_create_coupons_table.sql
-- 2. 20240101000001_create_coupon_usage_table.sql
-- 3. 20240101000002_create_validate_coupon_function.sql

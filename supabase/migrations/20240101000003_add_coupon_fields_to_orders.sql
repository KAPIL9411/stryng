-- Migration: Add coupon fields to orders table
-- Description: Add columns to track coupon usage in orders

-- Add coupon fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0;

-- Add index for coupon_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);

-- Add comment to document the columns
COMMENT ON COLUMN orders.coupon_id IS 'Reference to the coupon used in this order';
COMMENT ON COLUMN orders.coupon_code IS 'Coupon code used (stored for historical reference)';
COMMENT ON COLUMN orders.coupon_discount IS 'Discount amount applied from the coupon';

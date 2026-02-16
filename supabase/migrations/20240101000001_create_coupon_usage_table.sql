-- Create coupon_usage table
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON coupon_usage(order_id);

-- Add comment to table
COMMENT ON TABLE coupon_usage IS 'Tracks coupon usage history for orders';

-- Migration: Create function to increment coupon used_count
-- Description: Helper function to safely increment coupon usage counter

CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION increment_coupon_usage IS 'Increments the used_count for a coupon';


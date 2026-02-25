-- ============================================================================
-- COUPON SYSTEM - PRODUCTION MIGRATION SCRIPT
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor (Production)
-- This will create all necessary tables, functions, and schema changes
-- ============================================================================

-- MIGRATION 1: Create coupons table
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  max_discount DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1 CHECK (max_uses_per_user > 0),
  used_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_percentage CHECK (
    discount_type != 'percentage' OR (discount_value >= 0 AND discount_value <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON coupons(start_date, end_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE coupons IS 'Stores coupon/discount codes for the e-commerce system';

-- MIGRATION 2: Create coupon_usage table
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id VARCHAR(50) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON coupon_usage(order_id);

COMMENT ON TABLE coupon_usage IS 'Tracks coupon usage history for orders';
COMMENT ON COLUMN coupon_usage.order_id IS 'Order ID (matches orders.id format)';

-- MIGRATION 3: Create validate_coupon function
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code VARCHAR,
  p_user_id UUID,
  p_order_total DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER;
  v_discount_amount DECIMAL;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code)
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  IF NOW() < v_coupon.start_date THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon not yet valid');
  END IF;

  IF NOW() > v_coupon.end_date THEN
    RETURN json_build_object('valid', false, 'error', 'This coupon has expired');
  END IF;

  IF p_order_total < v_coupon.min_order_value THEN
    RETURN json_build_object(
      'valid', false,
      'error', format('Minimum order value of ₹%s required', v_coupon.min_order_value)
    );
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'This coupon has reached its usage limit');
  END IF;

  SELECT COUNT(*) INTO v_user_usage_count
  FROM coupon_usage
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := (p_order_total * v_coupon.discount_value / 100);
    IF v_coupon.max_discount IS NOT NULL AND v_discount_amount > v_coupon.max_discount THEN
      v_discount_amount := v_coupon.max_discount;
    END IF;
  ELSE
    v_discount_amount := v_coupon.discount_value;
  END IF;

  IF v_discount_amount > p_order_total THEN
    v_discount_amount := p_order_total;
  END IF;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_discount_amount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$ LANGUAGE plpgsql;

-- MIGRATION 4: Add coupon fields to orders table
-- ============================================================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);

COMMENT ON COLUMN orders.coupon_id IS 'Reference to the coupon used in this order';
COMMENT ON COLUMN orders.coupon_code IS 'Coupon code used (stored for historical reference)';
COMMENT ON COLUMN orders.coupon_discount IS 'Discount amount applied from the coupon';

-- MIGRATION 5: Fix orders.total and payments.amount types
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS recent_orders_view CASCADE;

ALTER TABLE orders
ALTER COLUMN total TYPE DECIMAL(10, 2);

ALTER TABLE payments
ALTER COLUMN amount TYPE DECIMAL(10, 2);

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

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_stats_idx ON dashboard_stats ((1));
CREATE UNIQUE INDEX IF NOT EXISTS recent_orders_view_idx ON recent_orders_view (id);

COMMENT ON COLUMN orders.total IS 'Order total amount (supports decimal values)';
COMMENT ON COLUMN payments.amount IS 'Payment amount (supports decimal values)';

-- MIGRATION 6: Create increment function
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_coupon_usage IS 'Increments the used_count for a coupon';

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Verify all tables and functions were created successfully
-- 2. Create your first coupon via the admin panel
-- 3. Test coupon application in cart/checkout
-- ============================================================================

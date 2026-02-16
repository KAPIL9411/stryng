-- Create coupons table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON coupons(start_date, end_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE coupons IS 'Stores coupon/discount codes for the e-commerce system';

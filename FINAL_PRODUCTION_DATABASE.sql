-- =====================================================
-- FINAL PRODUCTION DATABASE - STRYNG CLOTHING
-- Complete E-Commerce Platform - Industry Standard
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy this ENTIRE file
-- 3. Click "Run"
-- 4. Wait 30-60 seconds
-- 5. Sign out and sign in
--
-- This script is IDEMPOTENT (safe to run multiple times)
-- All constraint issues are FIXED
-- =====================================================

-- =====================================================
-- SECTION 1: CLEANUP & EXTENSIONS
-- =====================================================

-- Drop all existing policies first to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_set_default_address ON customer_addresses;
DROP TRIGGER IF EXISTS trigger_order_status_history ON orders;
DROP TRIGGER IF EXISTS trigger_update_customer_addresses ON customer_addresses;
DROP TRIGGER IF EXISTS trigger_update_payments ON payments;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SECTION 2: CORE TABLES
-- =====================================================

-- 2.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    address JSONB,
    role TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.2 PRODUCTS TABLE (with inventory columns)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    original_price INTEGER,
    discount INTEGER,
    category TEXT,
    images TEXT[],
    colors JSONB,
    sizes TEXT[],
    rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    is_new BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    brand TEXT,
    stock INTEGER DEFAULT 0,
    sku VARCHAR(50) UNIQUE,
    low_stock_threshold INTEGER DEFAULT 10,
    track_inventory BOOLEAN DEFAULT true,
    reorder_point INTEGER DEFAULT 20,
    reorder_quantity INTEGER DEFAULT 50
);

-- 2.3 ORDERS TABLE (with payment columns)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    total INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    address JSONB NOT NULL,
    timeline JSONB NOT NULL,
    payment_method TEXT DEFAULT 'upi',
    transaction_id TEXT,
    payment_status TEXT DEFAULT 'pending'
);

-- 2.4 ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    size TEXT,
    color JSONB,
    price INTEGER NOT NULL
);

-- 2.5 BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    cta_text TEXT DEFAULT 'Shop Now',
    cta_link TEXT DEFAULT '/products',
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- SECTION 3: ORDER MANAGEMENT TABLES
-- =====================================================

-- 3.1 ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'payment_pending', 'placed', 'confirmed', 
        'processing', 'packed', 'shipped', 'out_for_delivery', 
        'delivered', 'cancelled', 'returned', 'refunded', 'failed'
    ))
);

-- 3.2 PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    transaction_id TEXT UNIQUE,
    gateway_response JSONB,
    payment_date TIMESTAMPTZ,
    refund_amount INTEGER DEFAULT 0,
    refund_date TIMESTAMPTZ,
    refund_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'upi', 'card', 'netbanking', 'wallet', 'emi', 'cod'
    )),
    CONSTRAINT valid_payment_status CHECK (payment_status IN (
        'pending', 'awaiting_verification', 'verification_pending', 'paid',
        'processing', 'success', 'failed', 'refunded', 'partially_refunded'
    ))
);

-- 3.3 SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    courier_partner TEXT,
    tracking_number TEXT UNIQUE,
    awb_number TEXT,
    shipping_label_url TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date TIMESTAMPTZ,
    delivery_proof_url TEXT,
    delivery_notes TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 4: ADDRESS & PINCODE SYSTEM
-- =====================================================

-- 4.1 SERVICEABLE PINCODES
CREATE TABLE IF NOT EXISTS serviceable_pincodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pincode VARCHAR(6) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_cod_available BOOLEAN DEFAULT true,
    estimated_delivery_days INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT valid_pincode CHECK (pincode ~ '^[0-9]{6}$')
);

-- 4.2 CUSTOMER ADDRESSES
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    landmark VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address_type VARCHAR(20) DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_phone CHECK (phone ~ '^[0-9]{10,15}$'),
    CONSTRAINT valid_pincode CHECK (pincode ~ '^[0-9]{6}$')
);

-- 4.3 PINCODE CHECK LOGS
CREATE TABLE IF NOT EXISTS pincode_check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pincode VARCHAR(6) NOT NULL,
    is_serviceable BOOLEAN NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    product_id UUID REFERENCES products(id),
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    CONSTRAINT valid_pincode CHECK (pincode ~ '^[0-9]{6}$')
);

-- =====================================================
-- SECTION 5: INVENTORY MANAGEMENT TABLES
-- =====================================================

-- 5.1 PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    color_hex VARCHAR(7),
    stock INTEGER DEFAULT 0 NOT NULL,
    price INTEGER,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5.2 STOCK MOVEMENTS (Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'return')),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('sale', 'return', 'restock', 'damage', 'adjustment', 'initial', 'transfer')),
    reference_id UUID,
    reference_type VARCHAR(50),
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5.3 LOW STOCK ALERTS
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SECTION 6: MARKETING & COUPONS
-- =====================================================

-- 6.1 COUPONS
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value INTEGER NOT NULL,
    min_order_value INTEGER DEFAULT 0,
    max_discount INTEGER,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    user_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    applicable_categories TEXT[],
    applicable_products UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    CONSTRAINT valid_discount_value CHECK (
        (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100) OR
        (discount_type = 'fixed' AND discount_value > 0) OR
        (discount_type = 'free_shipping' AND discount_value >= 0)
    )
);

-- 6.2 COUPON USAGE
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_amount INTEGER NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, order_id)
);

-- =====================================================
-- SECTION 7: REVIEWS & RATINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_id, order_id)
);

-- =====================================================
-- SECTION 8: PERFORMANCE INDEXES
-- =====================================================

-- Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Orders Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Banners Indexes
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_banners_sort_order ON banners(sort_order);

-- Address Indexes
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON customer_addresses(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_serviceable_pincodes_pincode ON serviceable_pincodes(pincode) WHERE is_active = true;

-- Payments Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Order Status History Index
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);

-- =====================================================
-- SECTION 9: FUNCTIONS
-- =====================================================

-- 9.1 Admin Check Function (Security Definer)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- 9.2 Update Timestamp Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.3 Set Default Address Function
CREATE OR REPLACE FUNCTION set_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE customer_addresses
        SET is_default = false
        WHERE user_id = NEW.user_id 
        AND id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.4 Create Order Status History
CREATE OR REPLACE FUNCTION create_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO order_status_history (order_id, status, created_by)
        VALUES (NEW.id, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 10: TRIGGERS
-- =====================================================

-- Trigger for default address
DROP TRIGGER IF EXISTS trigger_set_default_address ON customer_addresses;
CREATE TRIGGER trigger_set_default_address
BEFORE INSERT OR UPDATE ON customer_addresses
FOR EACH ROW
EXECUTE FUNCTION set_default_address();

-- Trigger for order status history
DROP TRIGGER IF EXISTS trigger_order_status_history ON orders;
CREATE TRIGGER trigger_order_status_history
AFTER INSERT OR UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION create_order_status_history();

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_customer_addresses ON customer_addresses;
CREATE TRIGGER trigger_update_customer_addresses
BEFORE UPDATE ON customer_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payments ON payments;
CREATE TRIGGER trigger_update_payments
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 11: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviceable_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pincode_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users Read Own Role" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin Read All Profiles" ON profiles FOR SELECT USING (is_admin());

-- Products Policies
CREATE POLICY "Products are viewable by everyone." ON products FOR SELECT USING (true);
CREATE POLICY "Admin Manage Products" ON products FOR ALL USING (is_admin());

-- Orders Policies
CREATE POLICY "Users can view their own orders." ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders." ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders." ON orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin View All Orders" ON orders FOR SELECT USING (is_admin());
CREATE POLICY "Admin Update Orders" ON orders FOR UPDATE USING (is_admin());
CREATE POLICY "Admin Delete Orders" ON orders FOR DELETE USING (is_admin());

-- Order Items Policies
CREATE POLICY "Users can view their own order items." ON order_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own order items." ON order_items FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage order items" ON order_items FOR ALL USING (is_admin());

-- Banners Policies
CREATE POLICY "Enable read access for all users" ON banners FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON banners FOR ALL USING (is_admin());

-- Address Policies
CREATE POLICY "Users can view own addresses" ON customer_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON customer_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON customer_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON customer_addresses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all addresses" ON customer_addresses FOR SELECT USING (is_admin());

-- Pincode Policies
CREATE POLICY "Anyone can view active pincodes" ON serviceable_pincodes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all pincodes" ON serviceable_pincodes FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert pincodes" ON serviceable_pincodes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update pincodes" ON serviceable_pincodes FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete pincodes" ON serviceable_pincodes FOR DELETE USING (is_admin());

-- Payments Policies
CREATE POLICY "Users can view own payments" ON payments FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can update own payments" ON payments FOR UPDATE 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage payments" ON payments FOR ALL USING (is_admin());

-- Order Status History Policies
CREATE POLICY "Users can view own order history" ON order_status_history FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "System can insert order history" ON order_status_history FOR INSERT 
WITH CHECK (true);
CREATE POLICY "Admins can manage order history" ON order_status_history FOR ALL USING (is_admin());

-- Shipments Policies
CREATE POLICY "Users can view own shipments" ON shipments FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage shipments" ON shipments FOR ALL USING (is_admin());

-- Reviews Policies
CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can manage own reviews" ON reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON reviews FOR ALL USING (is_admin());

-- Coupons Policies
CREATE POLICY "Anyone can view active coupons" ON coupons FOR SELECT 
USING (is_active = true AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until >= NOW()));
CREATE POLICY "Admins can manage coupons" ON coupons FOR ALL USING (is_admin());

-- Coupon Usage Policies
CREATE POLICY "Users can view own coupon usage" ON coupon_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coupon usage" ON coupon_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage coupon usage" ON coupon_usage FOR ALL USING (is_admin());

-- =====================================================
-- SECTION 12: SET ADMIN USER
-- =====================================================

INSERT INTO public.profiles (id, email, role, full_name)
SELECT id, email, 'admin', COALESCE(raw_user_meta_data->>'full_name', 'Admin User')
FROM auth.users
WHERE email = 'kurmikapil154@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- =====================================================
-- SECTION 13: SAMPLE DATA
-- =====================================================

-- Sample Pincodes
INSERT INTO serviceable_pincodes (pincode, city, state, is_cod_available, estimated_delivery_days) VALUES
('400001', 'Mumbai', 'Maharashtra', true, 2),
('110001', 'New Delhi', 'Delhi', true, 3),
('560001', 'Bangalore', 'Karnataka', true, 3),
('700001', 'Kolkata', 'West Bengal', true, 4),
('600001', 'Chennai', 'Tamil Nadu', true, 4)
ON CONFLICT (pincode) DO NOTHING;

-- Sample Coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, valid_until) VALUES
('WELCOME10', 'Welcome offer - 10% off', 'percentage', 10, 500, 200, 1000, NOW() + INTERVAL '30 days'),
('FLAT100', 'Flat ₹100 off on orders above ₹999', 'fixed', 100, 999, NULL, NULL, NOW() + INTERVAL '30 days'),
('FREESHIP', 'Free shipping', 'free_shipping', 0, 0, NULL, NULL, NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SECTION 14: OPTIMIZE DATABASE
-- =====================================================

ANALYZE profiles;
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
ANALYZE banners;
ANALYZE customer_addresses;
ANALYZE serviceable_pincodes;
ANALYZE payments;
ANALYZE order_status_history;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- 
-- ✅ All tables created
-- ✅ All indexes optimized
-- ✅ All constraints FIXED
-- ✅ RLS policies configured
-- ✅ Admin user set
-- ✅ Sample data added
--
-- NEXT STEPS:
-- 1. Sign out and sign in
-- 2. Test admin panel
-- 3. Create products
-- 4. Test order flow
--
-- =====================================================

-- ============================================
-- E-COMMERCE PLATFORM OPTIMIZATION
-- PRODUCTION DATABASE MIGRATION
-- ============================================
-- This consolidated migration includes all database optimizations:
-- 1. Performance indexes for frequently queried fields
-- 2. Foreign key constraints for referential integrity
-- 3. Batch operation functions to avoid N+1 patterns
--
-- Requirements: 2.1, 2.2, 2.3
-- Date: 2024
-- ============================================

-- ============================================
-- PART 1: PERFORMANCE INDEXES
-- ============================================
-- These indexes optimize common query patterns for product listings,
-- order history, cart operations, and address lookups.

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at DESC);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Cart items table indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Addresses table indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- ============================================
-- PART 2: FOREIGN KEY CONSTRAINTS
-- ============================================
-- These constraints ensure referential integrity and prevent orphaned records.

-- Orders table foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_orders_user_id'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user_id
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_orders_shipping_address_id'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT fk_orders_shipping_address_id
    FOREIGN KEY (shipping_address_id) 
    REFERENCES addresses(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Order items table foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_order_items_order_id'
  ) THEN
    ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_order_id
    FOREIGN KEY (order_id) 
    REFERENCES orders(id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_order_items_product_id'
  ) THEN
    ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_product_id
    FOREIGN KEY (product_id) 
    REFERENCES products(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Addresses table foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_addresses_user_id'
  ) THEN
    ALTER TABLE addresses
    ADD CONSTRAINT fk_addresses_user_id
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Cart items table foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_cart_items_user_id'
  ) THEN
    ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_user_id
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_cart_items_product_id'
  ) THEN
    ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_product_id
    FOREIGN KEY (product_id) 
    REFERENCES products(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- PART 3: BATCH OPERATION FUNCTIONS
-- ============================================
-- These functions prevent N+1 query patterns by processing multiple
-- items in a single database transaction.

-- Batch Decrement Stock Function
CREATE OR REPLACE FUNCTION batch_decrement_stock(
    items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item jsonb;
    result jsonb := '[]'::jsonb;
    item_result jsonb;
    current_stock integer;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        SELECT stock INTO current_stock
        FROM products
        WHERE id = (item->>'product_id')::uuid;

        IF current_stock IS NULL THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Product not found'
            );
        ELSIF current_stock < (item->>'quantity')::integer THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Insufficient stock',
                'current_stock', current_stock,
                'requested', (item->>'quantity')::integer
            );
        ELSE
            UPDATE products
            SET stock = stock - (item->>'quantity')::integer,
                updated_at = NOW()
            WHERE id = (item->>'product_id')::uuid;

            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', true,
                'decremented', (item->>'quantity')::integer
            );
        END IF;

        result := result || jsonb_build_array(item_result);
    END LOOP;

    RETURN result;
END;
$$;

-- Batch Reserve Inventory Function
CREATE OR REPLACE FUNCTION batch_reserve_inventory(
    p_user_id uuid,
    p_items jsonb,
    p_timeout_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item jsonb;
    result jsonb := '[]'::jsonb;
    item_result jsonb;
    current_stock integer;
    reserved_stock integer;
    available_stock integer;
    reservation_id uuid;
    expires_at timestamp;
BEGIN
    expires_at := NOW() + (p_timeout_minutes || ' minutes')::interval;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT stock INTO current_stock
        FROM products
        WHERE id = (item->>'product_id')::uuid;

        SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
        FROM inventory_reservations
        WHERE product_id = (item->>'product_id')::uuid
        AND expires_at > NOW()
        AND status = 'active';

        available_stock := current_stock - reserved_stock;

        IF current_stock IS NULL THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Product not found'
            );
        ELSIF available_stock < (item->>'quantity')::integer THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Insufficient stock',
                'available', available_stock,
                'requested', (item->>'quantity')::integer
            );
        ELSE
            INSERT INTO inventory_reservations (
                user_id,
                product_id,
                quantity,
                expires_at,
                status
            ) VALUES (
                p_user_id,
                (item->>'product_id')::uuid,
                (item->>'quantity')::integer,
                expires_at,
                'active'
            )
            RETURNING id INTO reservation_id;

            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', true,
                'reservation_id', reservation_id,
                'expires_at', expires_at
            );
        END IF;

        result := result || jsonb_build_array(item_result);
    END LOOP;

    RETURN result;
END;
$$;

-- Grant Execute Permissions
GRANT EXECUTE ON FUNCTION batch_decrement_stock(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_reserve_inventory(uuid, jsonb, integer) TO authenticated;

-- Add Comments
COMMENT ON FUNCTION batch_decrement_stock IS 'Batch decrement stock for multiple products to avoid N+1 pattern';
COMMENT ON FUNCTION batch_reserve_inventory IS 'Batch reserve inventory for multiple products to avoid N+1 pattern';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the migration was successful:

-- Verify indexes
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Verify foreign keys
-- SELECT
--   tc.table_name, 
--   tc.constraint_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
-- ORDER BY tc.table_name;

-- Verify functions
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name LIKE 'batch_%'
-- ORDER BY routine_name;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

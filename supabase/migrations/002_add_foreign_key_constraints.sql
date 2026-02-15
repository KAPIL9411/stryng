-- Migration: Add foreign key constraints for referential integrity
-- Requirements: 2.3
-- Description: This migration adds foreign key constraints to ensure referential
-- integrity between related tables in the e-commerce platform. Foreign keys
-- prevent orphaned records and maintain data consistency.

-- Orders table foreign keys
-- Link orders to users (auth.users is Supabase's built-in auth table)
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

-- Link orders to shipping addresses
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
-- Link order items to orders (cascade delete when order is deleted)
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

-- Link order items to products
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
-- Link addresses to users
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
-- Link cart items to users
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

-- Link cart items to products
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

-- Verify foreign key constraints were created
-- Run this query to check all foreign keys:
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
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, tc.constraint_name;

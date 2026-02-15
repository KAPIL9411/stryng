-- Migration: Add performance indexes for frequently queried fields
-- Requirements: 2.1
-- Description: This migration adds indexes to optimize common query patterns
-- in the e-commerce platform, improving database performance for product
-- listings, order history, cart operations, and address lookups.

-- Products table indexes
-- Index for filtering products by category (product listing page)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Index for sorting products by creation date (new arrivals)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Index for filtering products by price (price range filters)
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Orders table indexes
-- Composite index for user order history (user_id + created_at for sorting)
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at DESC);

-- Order items table indexes
-- Index for fetching items belonging to an order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Cart items table indexes
-- Index for fetching user's cart items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Addresses table indexes
-- Index for fetching user's addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- Verify indexes were created
-- Run this query to check all indexes:
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

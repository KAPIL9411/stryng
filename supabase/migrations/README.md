# Database Migrations

This directory contains SQL migration files for the Stryng Clothing e-commerce platform.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Log in to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of the migration file (e.g., `001_add_performance_indexes.sql`)
6. Paste into the SQL editor
7. Click **Run** to execute the migration

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db execute --file supabase/migrations/001_add_performance_indexes.sql
```

### Option 3: Direct Database Connection

If you have direct PostgreSQL access:

```bash
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/001_add_performance_indexes.sql
```

## Migration Files

### 001_add_performance_indexes.sql

**Purpose**: Adds database indexes for frequently queried fields to improve query performance.

**Indexes Created**:
- `idx_products_category` - Optimizes product filtering by category
- `idx_products_created_at` - Optimizes sorting by creation date (new arrivals)
- `idx_products_price` - Optimizes price range filtering
- `idx_orders_user_id_created_at` - Optimizes user order history queries
- `idx_order_items_order_id` - Optimizes order details lookup
- `idx_cart_items_user_id` - Optimizes cart retrieval
- `idx_addresses_user_id` - Optimizes user address lookup

**Requirements**: Validates Requirement 2.1 (Database Performance Optimization)

**Impact**: 
- Significantly improves query performance for product listings, order history, and cart operations
- Reduces database load by enabling efficient index scans instead of full table scans
- No downtime required - indexes are created with `IF NOT EXISTS` clause

### 002_add_foreign_key_constraints.sql

**Purpose**: Adds foreign key constraints to ensure referential integrity between related tables.

**Foreign Keys Created**:
- `fk_orders_user_id` - orders.user_id → auth.users.id (CASCADE)
- `fk_orders_shipping_address_id` - orders.shipping_address_id → addresses.id (SET NULL)
- `fk_order_items_order_id` - order_items.order_id → orders.id (CASCADE)
- `fk_order_items_product_id` - order_items.product_id → products.id (RESTRICT)
- `fk_addresses_user_id` - addresses.user_id → auth.users.id (CASCADE)
- `fk_cart_items_user_id` - cart_items.user_id → auth.users.id (CASCADE)
- `fk_cart_items_product_id` - cart_items.product_id → products.id (CASCADE)

**Requirements**: Validates Requirement 2.3 (Database Performance Optimization)

**Impact**:
- Ensures data consistency by preventing orphaned records
- Automatically cascades deletions where appropriate (e.g., deleting a user removes their orders)
- Prevents deletion of products that are referenced in orders (RESTRICT)
- Maintains referential integrity across all related tables
- No downtime required - constraints are added with conditional checks

**Delete Rules**:
- **CASCADE**: When parent record is deleted, child records are automatically deleted
  - Used for: user → orders, user → addresses, user → cart_items, order → order_items, product → cart_items
- **SET NULL**: When parent record is deleted, foreign key is set to NULL
  - Used for: address → orders (allows address deletion without affecting orders)
- **RESTRICT**: Prevents deletion of parent record if child records exist
  - Used for: product → order_items (prevents product deletion if in past orders)

## Verifying Indexes

After applying the migration, verify the indexes were created successfully:

```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Expected output should show all 7 indexes listed above.

## Verifying Foreign Keys

After applying migration 002, verify the foreign key constraints were created successfully:

```sql
SELECT
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
```

Expected output should show all 7 foreign key constraints listed above.

You can also run the comprehensive verification script:
```bash
# In Supabase SQL Editor, run:
supabase/migrations/verify_foreign_keys.sql
```

## Performance Testing

To verify the performance improvement:

1. **Before Migration**: Run `EXPLAIN ANALYZE` on common queries
2. **Apply Migration**: Execute the migration SQL
3. **After Migration**: Run the same `EXPLAIN ANALYZE` queries
4. Compare execution times and query plans

Example test query:
```sql
EXPLAIN ANALYZE
SELECT * FROM products 
WHERE category = 'shirts' 
ORDER BY created_at DESC 
LIMIT 20;
```

You should see the query plan change from "Seq Scan" to "Index Scan" after applying the indexes.

## Rollback

### Rollback Indexes (Migration 001)

If you need to remove the indexes:

```sql
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_created_at;
DROP INDEX IF EXISTS idx_products_price;
DROP INDEX IF EXISTS idx_orders_user_id_created_at;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_cart_items_user_id;
DROP INDEX IF EXISTS idx_addresses_user_id;
```

### Rollback Foreign Keys (Migration 002)

If you need to remove the foreign key constraints:

```sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_user_id;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_shipping_address_id;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_order_id;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_product_id;
ALTER TABLE addresses DROP CONSTRAINT IF EXISTS fk_addresses_user_id;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_user_id;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_product_id;
```

**Warning**: Removing foreign key constraints will disable referential integrity checks. Only do this if you need to revert the migration for a specific reason.

## Notes

- All indexes use `IF NOT EXISTS` to prevent errors if run multiple times
- Indexes are created on the `public` schema (Supabase default)
- No data migration is required - this is a schema-only change
- Indexes will be automatically maintained by PostgreSQL as data changes

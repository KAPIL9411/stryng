# Database Foreign Key Relationships

This document describes the foreign key constraints implemented in the e-commerce platform database to ensure referential integrity.

## Overview

Foreign key constraints enforce relationships between tables and maintain data consistency by:
- Preventing orphaned records (child records without valid parent references)
- Automatically cascading deletions where appropriate
- Restricting deletions that would break data integrity
- Ensuring all references point to valid records

## Foreign Key Relationships

### Orders Table

#### orders.user_id → auth.users.id
- **Delete Rule**: CASCADE
- **Purpose**: Links each order to the user who placed it
- **Behavior**: When a user is deleted, all their orders are automatically deleted
- **Rationale**: Orders belong to users and have no meaning without the user context

#### orders.shipping_address_id → addresses.id
- **Delete Rule**: SET NULL
- **Purpose**: Links each order to the shipping address used
- **Behavior**: When an address is deleted, the order's shipping_address_id is set to NULL
- **Rationale**: Orders should be preserved even if the address is deleted (address data is typically duplicated in the order for historical purposes)

### Order Items Table

#### order_items.order_id → orders.id
- **Delete Rule**: CASCADE
- **Purpose**: Links each order item to its parent order
- **Behavior**: When an order is deleted, all its order items are automatically deleted
- **Rationale**: Order items have no meaning without their parent order

#### order_items.product_id → products.id
- **Delete Rule**: RESTRICT
- **Purpose**: Links each order item to the product that was ordered
- **Behavior**: Prevents deletion of a product if it appears in any order items
- **Rationale**: Historical order data must be preserved; products in past orders cannot be deleted

### Addresses Table

#### addresses.user_id → auth.users.id
- **Delete Rule**: CASCADE
- **Purpose**: Links each address to the user who owns it
- **Behavior**: When a user is deleted, all their addresses are automatically deleted
- **Rationale**: Addresses belong to users and have no meaning without the user context

### Cart Items Table

#### cart_items.user_id → auth.users.id
- **Delete Rule**: CASCADE
- **Purpose**: Links each cart item to the user's cart
- **Behavior**: When a user is deleted, all their cart items are automatically deleted
- **Rationale**: Cart items belong to users and have no meaning without the user context

#### cart_items.product_id → products.id
- **Delete Rule**: CASCADE
- **Purpose**: Links each cart item to the product in the cart
- **Behavior**: When a product is deleted, it's automatically removed from all carts
- **Rationale**: If a product no longer exists, it should be removed from shopping carts

## Delete Rule Strategies

### CASCADE
Used when child records have no independent meaning without their parent:
- User → Orders: Orders belong to users
- User → Addresses: Addresses belong to users
- User → Cart Items: Cart items belong to users
- Order → Order Items: Order items belong to orders
- Product → Cart Items: Cart items reference current products

**Effect**: Automatically deletes child records when parent is deleted.

### SET NULL
Used when child records should be preserved but the reference can be optional:
- Address → Orders: Orders preserve historical data even if address is deleted

**Effect**: Sets the foreign key to NULL when parent is deleted, preserving the child record.

### RESTRICT
Used when parent records should not be deleted if they have dependent children:
- Product → Order Items: Products in historical orders cannot be deleted

**Effect**: Prevents deletion of parent record if any child records exist.

## Data Integrity Benefits

1. **Prevents Orphaned Records**: Cannot create orders for non-existent users or order items for non-existent orders

2. **Automatic Cleanup**: Deleting a user automatically cleans up their orders, addresses, and cart items

3. **Historical Preservation**: Products in past orders cannot be accidentally deleted

4. **Consistency Guarantees**: Database enforces relationships at the data layer, not just application layer

5. **Error Prevention**: Invalid references are caught at insert/update time with clear error messages

## Testing Referential Integrity

After applying the foreign key constraints, you can test them:

### Test 1: Verify No Orphaned Records
```sql
-- Check for orders without valid users
SELECT COUNT(*) FROM orders o
LEFT JOIN auth.users u ON o.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0

-- Check for order_items without valid orders
SELECT COUNT(*) FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;
-- Expected: 0
```

### Test 2: Test CASCADE Behavior
```sql
-- Create a test user and order
INSERT INTO auth.users (id, email) VALUES ('test-user-id', 'test@example.com');
INSERT INTO orders (id, user_id, status, total) 
VALUES ('test-order-id', 'test-user-id', 'pending', 100.00);

-- Delete the user
DELETE FROM auth.users WHERE id = 'test-user-id';

-- Verify the order was automatically deleted
SELECT COUNT(*) FROM orders WHERE id = 'test-order-id';
-- Expected: 0
```

### Test 3: Test RESTRICT Behavior
```sql
-- Try to delete a product that's in an order
DELETE FROM products WHERE id IN (
  SELECT DISTINCT product_id FROM order_items
);
-- Expected: Error - violates foreign key constraint
```

## Migration Safety

The foreign key migration (`002_add_foreign_key_constraints.sql`) is designed to be safe:

1. **Idempotent**: Uses conditional checks to prevent errors if run multiple times
2. **Non-Destructive**: Only adds constraints, doesn't modify data
3. **Validation**: Includes verification queries to confirm constraints are working
4. **Rollback**: Provides clear rollback instructions if needed

## Performance Considerations

Foreign key constraints have minimal performance impact:

- **Inserts/Updates**: Small overhead to validate references (typically < 1ms)
- **Deletes**: May need to check child tables, but this is necessary for data integrity
- **Queries**: No impact on SELECT queries
- **Indexes**: Foreign key columns should be indexed (already done in migration 001)

## Best Practices

1. **Always use foreign keys** for relationships between tables
2. **Choose appropriate delete rules** based on business logic
3. **Index foreign key columns** for optimal performance (already implemented)
4. **Test constraints** after applying migrations
5. **Document relationships** for future developers (this document)

## Troubleshooting

### Error: "violates foreign key constraint"

**Cause**: Trying to insert/update a record with an invalid foreign key reference.

**Solution**: Ensure the referenced record exists before creating the child record.

Example:
```sql
-- Wrong: Order references non-existent user
INSERT INTO orders (user_id, ...) VALUES ('non-existent-user', ...);
-- Error: violates foreign key constraint "fk_orders_user_id"

-- Correct: Verify user exists first
SELECT id FROM auth.users WHERE id = 'user-id';
-- Then insert order
INSERT INTO orders (user_id, ...) VALUES ('user-id', ...);
```

### Error: "update or delete on table violates foreign key constraint"

**Cause**: Trying to delete a parent record that has dependent child records (RESTRICT rule).

**Solution**: Delete child records first, or update them to reference a different parent.

Example:
```sql
-- Wrong: Delete product that's in orders
DELETE FROM products WHERE id = 'product-id';
-- Error: violates foreign key constraint "fk_order_items_product_id"

-- Correct: Check if product is in any orders first
SELECT COUNT(*) FROM order_items WHERE product_id = 'product-id';
-- If count > 0, product cannot be deleted (by design)
-- Consider marking product as inactive instead of deleting
UPDATE products SET active = false WHERE id = 'product-id';
```

## Related Documentation

- [Database Indexes](./database-indexes.md) - Performance optimization through indexes
- [Migration README](../supabase/migrations/README.md) - How to apply migrations
- [Design Document](../.kiro/specs/e-commerce-platform-optimization/design.md) - Overall system design

## References

- PostgreSQL Foreign Keys: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
- Supabase Database: https://supabase.com/docs/guides/database
- Referential Integrity: https://en.wikipedia.org/wiki/Referential_integrity

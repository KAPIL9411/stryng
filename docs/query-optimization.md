# Query Optimization - JOIN Usage

## Overview

This document describes how the e-commerce platform uses JOIN operations (via Supabase's nested select syntax) to efficiently fetch related data and avoid N+1 query patterns.

## Supabase JOIN Syntax

Supabase uses a nested select syntax that translates to SQL JOINs under the hood:

```javascript
// This Supabase query:
.select(`
  *,
  order_items (
    *,
    products (*)
  )
`)

// Translates to SQL:
SELECT orders.*, order_items.*, products.*
FROM orders
LEFT JOIN order_items ON order_items.order_id = orders.id
LEFT JOIN products ON products.id = order_items.product_id
```

## Optimized Query Implementations

### 1. Fetch Orders with Items (Already Optimized)

**Location**: `src/api/orders.api.js`

#### getUserOrders()

```javascript
const { data: orders, error } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (
        id,
        name,
        slug,
        images,
        brand
      )
    )
  `)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

**Optimization**: Single query fetches orders, order items, and product details using nested JOINs.

**Query Count**: 1 (regardless of number of orders or items)

#### getOrderById()

```javascript
const { data: order, error } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (
        id,
        name,
        slug,
        images,
        brand
      )
    ),
    payments (*),
    shipments (*)
  `)
  .eq('id', orderId)
  .single();
```

**Optimization**: Single query fetches order with all related data (items, products, payments, shipments).

**Query Count**: 1

#### getAllOrders() (Admin)

```javascript
let query = supabase
  .from('orders')
  .select(`
    *,
    profiles!orders_user_id_fkey (
      email,
      full_name,
      phone
    ),
    order_items (
      *,
      products (
        id,
        name,
        slug,
        images
      )
    ),
    payments (*)
  `)
  .order('created_at', { ascending: false });
```

**Optimization**: Single query fetches all orders with user profiles, items, products, and payments.

**Query Count**: 1

### 2. Products with Categories

**Location**: `src/api/products.api.js`

#### fetchProducts()

```javascript
let query = supabase
  .from(API_ENDPOINTS.PRODUCTS)
  .select(
    'id, name, slug, price, original_price, discount, images, brand, category, colors, sizes, is_new, is_trending, rating, reviews_count, stock, low_stock_threshold',
    { count: 'exact' }
  )
  .range(start, end);
```

**Note**: Products don't have a separate categories table - `category` is a string field on the products table. No JOIN needed.

**Query Count**: 1

## Performance Comparison

### Before Optimization (N+1 Pattern)

```javascript
// Fetch orders (1 query)
const orders = await fetchOrders();

// For each order, fetch items (N queries)
for (const order of orders) {
  const items = await fetchOrderItems(order.id);
  
  // For each item, fetch product (N*M queries)
  for (const item of items) {
    const product = await fetchProduct(item.product_id);
  }
}
```

**Total Queries**: 1 + N + (N * M)
- Example: 10 orders with 5 items each = 1 + 10 + 50 = **61 queries**

### After Optimization (JOIN)

```javascript
// Fetch orders with items and products (1 query)
const orders = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (*)
    )
  `);
```

**Total Queries**: 1
- Example: 10 orders with 5 items each = **1 query**

**Performance Improvement**: 98% reduction in queries (61 → 1)

## Field Selection Optimization

To minimize payload size, we select only needed fields:

```javascript
// Instead of selecting all fields:
.select('*')

// Select specific fields:
.select('id, name, slug, price, images, brand')
```

**Benefits**:
- Smaller response payloads
- Faster network transfer
- Reduced memory usage
- Better performance

## Best Practices

### 1. Always Use Nested Selects for Related Data

✅ **Good**:
```javascript
.select(`
  *,
  order_items (
    *,
    products (id, name, price)
  )
`)
```

❌ **Bad**:
```javascript
const orders = await supabase.from('orders').select('*');
for (const order of orders) {
  const items = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);
}
```

### 2. Select Only Needed Fields

✅ **Good**:
```javascript
.select('id, name, price, images')
```

❌ **Bad**:
```javascript
.select('*')  // Fetches all fields including large text fields
```

### 3. Use Batch Operations for Non-Relational Queries

When JOINs aren't possible (e.g., RPC calls), use batch operations:

✅ **Good**:
```javascript
await batchDecrementStock(items);  // 1 query
```

❌ **Bad**:
```javascript
for (const item of items) {
  await decrementStock(item);  // N queries
}
```

## Database Indexes

To ensure JOIN queries are fast, we have indexes on foreign key columns:

```sql
-- Order items index
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Products index
CREATE INDEX idx_products_category ON products(category);

-- Orders index
CREATE INDEX idx_orders_user_id ON orders(user_id, created_at DESC);
```

See `docs/database-indexes.md` for complete index documentation.

## Monitoring Query Performance

### Development

Enable query logging in Supabase dashboard:
1. Go to Database → Query Performance
2. Monitor slow queries (>100ms)
3. Check query execution plans

### Production

Use Supabase's built-in monitoring:
1. Database → Performance
2. Track query counts
3. Monitor response times
4. Set up alerts for slow queries

## Related Documentation

- [Batch Operations](./batch-operations.md) - Batch query utilities
- [Database Indexes](./database-indexes.md) - Index strategy
- [Database Foreign Keys](./database-foreign-keys.md) - Relationship constraints

## Related Requirements

- **Requirement 2.2**: Use JOIN operations or batch queries to avoid N+1 query patterns
- **Property 2**: No N+1 query patterns - number of queries should be constant

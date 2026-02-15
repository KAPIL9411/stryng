# Batch Operations - N+1 Query Prevention

## Overview

This document describes the batch operation utilities implemented to prevent N+1 query patterns in the e-commerce platform. N+1 patterns occur when code makes one query to fetch a list of items, then makes additional queries for each item in the list.

## Problem: N+1 Query Pattern

### Example of N+1 Pattern (Before)

```javascript
// Fetch order items (1 query)
const { data: orderItems } = await supabase
  .from('order_items')
  .select('product_id, quantity')
  .eq('order_id', orderId);

// Decrement stock for each item (N queries)
for (const item of orderItems) {
  await supabase.rpc('decrement_stock', {
    product_id: item.product_id,
    quantity: item.quantity,
  });
}
```

**Problem**: If an order has 10 items, this makes 11 database queries (1 + 10).

## Solution: Batch Operations

### Batch Decrement Stock (After)

```javascript
// Fetch order items (1 query)
const { data: orderItems } = await supabase
  .from('order_items')
  .select('product_id, quantity')
  .eq('order_id', orderId);

// Decrement stock for all items (1 query)
await batchDecrementStock(orderItems);
```

**Solution**: Now this makes only 2 database queries regardless of order size.

## Available Batch Operations

### 1. batchDecrementStock

Decrements stock for multiple products in a single database call.

**Usage:**
```javascript
import { batchDecrementStock } from '../api/batch.api';

const items = [
  { product_id: 'uuid-1', quantity: 2 },
  { product_id: 'uuid-2', quantity: 1 },
  { product_id: 'uuid-3', quantity: 3 },
];

const result = await batchDecrementStock(items);
```

**Returns:**
```javascript
{
  success: true,
  data: [
    { product_id: 'uuid-1', success: true, decremented: 2 },
    { product_id: 'uuid-2', success: true, decremented: 1 },
    { product_id: 'uuid-3', success: false, error: 'Insufficient stock' }
  ]
}
```

### 2. batchCheckStock

Checks stock availability for multiple products in a single database call.

**Usage:**
```javascript
import { batchCheckStock } from '../api/batch.api';

const items = [
  { product_id: 'uuid-1', quantity: 2 },
  { product_id: 'uuid-2', quantity: 5 },
];

const result = await batchCheckStock(items);
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      product_id: 'uuid-1',
      product_name: 'T-Shirt',
      available: true,
      current_stock: 10,
      requested: 2,
      message: 'Available'
    },
    {
      product_id: 'uuid-2',
      product_name: 'Jeans',
      available: false,
      current_stock: 3,
      requested: 5,
      message: 'Only 3 available'
    }
  ]
}
```

### 3. batchReserveInventory

Reserves inventory for multiple products in a single database call.

**Usage:**
```javascript
import { batchReserveInventory } from '../api/batch.api';

const items = [
  { product_id: 'uuid-1', quantity: 2 },
  { product_id: 'uuid-2', quantity: 1 },
];

const result = await batchReserveInventory(userId, items, 15);
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      product_id: 'uuid-1',
      success: true,
      reservation_id: 'res-uuid-1',
      expires_at: '2024-01-01T12:15:00Z'
    },
    {
      product_id: 'uuid-2',
      success: true,
      reservation_id: 'res-uuid-2',
      expires_at: '2024-01-01T12:15:00Z'
    }
  ]
}
```

### 4. batchReleaseReservations

Releases multiple inventory reservations in a single database call.

**Usage:**
```javascript
import { batchReleaseReservations } from '../api/batch.api';

const reservationIds = ['res-uuid-1', 'res-uuid-2', 'res-uuid-3'];

const result = await batchReleaseReservations(reservationIds);
```

**Returns:**
```javascript
{
  success: true
}
```

## Database Functions

The batch operations use PostgreSQL functions that process multiple items in a single transaction:

### batch_decrement_stock(items jsonb)

- Accepts an array of items with `product_id` and `quantity`
- Decrements stock for all items atomically
- Returns success/failure for each item
- Validates stock availability before decrementing

### batch_reserve_inventory(p_user_id uuid, p_items jsonb, p_timeout_minutes integer)

- Accepts user ID, array of items, and timeout duration
- Creates reservations for all items atomically
- Checks available stock (current - reserved)
- Returns reservation IDs and expiration times

## Performance Impact

### Before Optimization

- Order with 10 items: **11 queries** (1 fetch + 10 decrements)
- Cart with 5 items: **6 queries** (1 per item + 1 validation)
- Checkout with 3 items: **7 queries** (1 per item + validation)

### After Optimization

- Order with 10 items: **2 queries** (1 fetch + 1 batch decrement)
- Cart with 5 items: **1 query** (batch check)
- Checkout with 3 items: **2 queries** (batch check + batch reserve)

### Performance Improvement

- **80-90% reduction** in database queries for multi-item operations
- **Faster response times** due to fewer round trips
- **Better scalability** as order size increases

## Implementation Locations

### Files Modified

1. **src/api/batch.api.js** - New batch operation utilities
2. **src/api/orders.api.js** - Uses `batchDecrementStock` in `verifyPayment`
3. **src/lib/inventory.js** - Uses `batchCheckStock` in `validateCartStockAsync`
4. **supabase/migrations/003_batch_operations.sql** - Database functions

### Functions Refactored

- `verifyPayment()` - Now uses batch decrement
- `validateCartStockAsync()` - Now uses batch check
- Future: `validateAndReserveStock()` in CheckoutOptimized.jsx

## Best Practices

1. **Use batch operations for any loop with database queries**
2. **Prefer single queries with JOINs over multiple queries**
3. **Use Supabase's nested select syntax for related data**
4. **Monitor query counts in development**

## Testing

To verify N+1 prevention:

1. Enable query logging in Supabase
2. Create an order with multiple items
3. Verify only 2 queries are executed (fetch + batch decrement)
4. Check cart validation with multiple items
5. Verify only 1 query is executed (batch check)

## Related Requirements

- **Requirement 2.2**: Use JOIN operations or batch queries to avoid N+1 query patterns
- **Property 2**: No N+1 query patterns - number of queries should be constant regardless of result count

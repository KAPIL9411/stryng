# Pagination Implementation

## Overview

This document describes the pagination implementation for collection endpoints in the e-commerce platform. Pagination limits result set sizes to improve performance and user experience.

## Implementation Details

### API Endpoints

#### Products API

The `fetchProducts` function already includes pagination support:

```javascript
fetchProducts(page = 1, limit = 24, filters = {})
```

**Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 24)
- `filters` (object): Filter options (category, price range, search, etc.)

**Returns:**
```javascript
{
  products: [...],
  pagination: {
    currentPage: 1,
    totalItems: 100,
    totalPages: 5,
    hasNext: true
  }
}
```

#### Orders API

##### getUserOrders

Fetches orders for the current authenticated user with pagination:

```javascript
getUserOrders(page = 1, pageSize = 10)
```

**Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 10)

**Returns:**
```javascript
{
  success: true,
  data: [...],
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 25,
    totalPages: 3,
    hasNext: true,
    hasPrev: false
  }
}
```

##### getAllOrders (Admin)

Fetches all orders with filters and pagination:

```javascript
getAllOrders(filters = {}, page = 1, pageSize = 20)
```

**Parameters:**
- `filters` (object): Filter options (status, payment_status, date range)
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20)

**Returns:**
```javascript
{
  success: true,
  data: [...],
  pagination: {
    currentPage: 1,
    pageSize: 20,
    totalItems: 150,
    totalPages: 8,
    hasNext: true,
    hasPrev: false
  }
}
```

### Pagination Calculation

The pagination uses Supabase's `range()` method:

```javascript
const start = (page - 1) * pageSize;
const end = start + pageSize - 1;

query.range(start, end);
```

**Example:**
- Page 1, pageSize 10: range(0, 9) → items 0-9
- Page 2, pageSize 10: range(10, 19) → items 10-19
- Page 3, pageSize 10: range(20, 29) → items 20-29

### Pagination Metadata

Each paginated response includes:

- `currentPage`: Current page number
- `pageSize`: Number of items per page
- `totalItems`: Total number of items across all pages
- `totalPages`: Total number of pages (calculated as `Math.ceil(totalItems / pageSize)`)
- `hasNext`: Boolean indicating if there's a next page
- `hasPrev`: Boolean indicating if there's a previous page

### UI Implementation

#### OrderHistory Page

The user order history page includes pagination controls:

```jsx
{pagination.totalPages > 1 && (
  <div className="pagination">
    <button
      onClick={() => fetchOrders(pagination.currentPage - 1)}
      disabled={!pagination.hasPrev || loading}
    >
      Previous
    </button>
    <span>
      Page {pagination.currentPage} of {pagination.totalPages}
    </span>
    <button
      onClick={() => fetchOrders(pagination.currentPage + 1)}
      disabled={!pagination.hasNext || loading}
    >
      Next
    </button>
  </div>
)}
```

#### AdminOrders Page

The admin orders page includes similar pagination controls with a larger page size (20 items).

## Performance Benefits

1. **Reduced Database Load**: Only fetches the required subset of data
2. **Faster Response Times**: Smaller payloads transfer faster
3. **Better User Experience**: Pages load quickly even with large datasets
4. **Memory Efficiency**: Client doesn't need to hold all data in memory

## Testing

Unit tests verify:
- Correct range calculation for different page/pageSize combinations
- Proper pagination metadata calculation
- hasNext/hasPrev flags are accurate
- Default values are applied correctly

See `src/api/orders.api.test.js` for test implementation.

## Requirements Validation

This implementation satisfies:
- **Requirement 2.5**: "WHEN a query retrieves collections, THE Platform SHALL implement pagination to limit result set size"
- **Property 3**: "Pagination limits result sets - For any collection endpoint, when pagination parameters are provided, the number of results returned should not exceed the specified page size"

## Future Enhancements

Potential improvements:
1. Add cursor-based pagination for real-time data
2. Implement infinite scroll for product listings
3. Add page size selector in UI
4. Cache pagination results for faster navigation
5. Add "Jump to page" functionality

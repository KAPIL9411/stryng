# Coupon System API Documentation

## Overview
The Coupon System provides APIs for managing discount coupons and applying them during checkout.

## Table of Contents
- [Admin APIs](#admin-apis)
- [Customer APIs](#customer-apis)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)

---

## Admin APIs

### Create Coupon
**Endpoint:** `POST /api/admin/coupons`  
**Authentication:** Required (Admin only)

**Request Body:**
```javascript
{
  code: string,              // Unique coupon code (4-20 chars, alphanumeric)
  description: string,       // Optional description
  discount_type: 'percentage' | 'fixed',
  discount_value: number,    // Percentage (0-100) or fixed amount
  max_discount: number,      // Optional, for percentage discounts
  min_order_value: number,   // Minimum order value required (default: 0)
  max_uses: number,          // Optional, null = unlimited
  max_uses_per_user: number, // Default: 1
  start_date: string,        // ISO timestamp
  end_date: string,          // ISO timestamp
  is_active: boolean         // Default: true
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    id: string,
    code: string,
    // ... all coupon fields
  }
}
```

---

### Get All Coupons
**Endpoint:** `GET /api/admin/coupons`  
**Authentication:** Required (Admin only)

**Query Parameters:**
- `status` (optional): 'active' | 'inactive' | 'expired'
- `search` (optional): Search by coupon code

**Response:**
```javascript
{
  success: true,
  data: [
    {
      id: string,
      code: string,
      discount_type: string,
      discount_value: number,
      used_count: number,
      // ... other fields
    }
  ]
}
```

---

### Get Coupon by ID
**Endpoint:** `GET /api/admin/coupons/:id`  
**Authentication:** Required (Admin only)

**Response:**
```javascript
{
  success: true,
  data: {
    id: string,
    code: string,
    // ... all coupon fields
  }
}
```

---

### Update Coupon
**Endpoint:** `PUT /api/admin/coupons/:id`  
**Authentication:** Required (Admin only)

**Request Body:** Same as Create Coupon (code cannot be changed)

**Response:**
```javascript
{
  success: true,
  data: {
    id: string,
    // ... updated coupon fields
  }
}
```

---

### Delete Coupon
**Endpoint:** `DELETE /api/admin/coupons/:id`  
**Authentication:** Required (Admin only)

**Note:** Cannot delete coupons with `used_count > 0`

**Response:**
```javascript
{
  success: true,
  message: 'Coupon deleted successfully'
}
```

**Error Response:**
```javascript
{
  success: false,
  error: 'Cannot delete coupon with existing usage'
}
```

---

### Toggle Coupon Status
**Endpoint:** `PATCH /api/admin/coupons/:id/toggle`  
**Authentication:** Required (Admin only)

**Response:**
```javascript
{
  success: true,
  data: {
    id: string,
    is_active: boolean,
    // ... other fields
  }
}
```

---

### Get Coupon Stats
**Endpoint:** `GET /api/admin/coupons/:id/stats`  
**Authentication:** Required (Admin only)

**Response:**
```javascript
{
  success: true,
  data: {
    total_uses: number,
    total_discount_given: number,
    unique_users: number,
    recent_usage: [
      {
        user_id: string,
        order_id: string,
        discount_amount: number,
        created_at: string
      }
    ]
  }
}
```

---

## Customer APIs

### Validate Coupon
**Endpoint:** `POST /api/coupons/validate`  
**Authentication:** Required

**Request Body:**
```javascript
{
  code: string,        // Coupon code
  user_id: string,     // User ID
  order_total: number  // Current cart total
}
```

**Response (Valid):**
```javascript
{
  success: true,
  data: {
    valid: true,
    coupon_id: string,
    code: string,
    discount_amount: number,
    discount_type: string,
    discount_value: number
  }
}
```

**Response (Invalid):**
```javascript
{
  success: true,
  data: {
    valid: false,
    error: string  // Specific error message
  }
}
```

**Validation Errors:**
- "Invalid coupon code"
- "This coupon has expired"
- "Minimum order value of ₹{amount} required"
- "This coupon has reached its usage limit"
- "You have already used this coupon"

---

### Get Available Coupons
**Endpoint:** `GET /api/coupons/available`  
**Authentication:** Required

**Query Parameters:**
- `order_total` (required): Current cart total

**Response:**
```javascript
{
  success: true,
  data: [
    {
      id: string,
      code: string,
      description: string,
      discount_type: string,
      discount_value: number,
      min_order_value: number,
      max_discount: number
    }
  ]
}
```

---

## Database Schema

### coupons Table
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### coupon_usage Table
```sql
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY,
  coupon_id UUID REFERENCES coupons(id),
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### orders Table (Coupon Fields)
```sql
ALTER TABLE orders
ADD COLUMN coupon_id UUID REFERENCES coupons(id),
ADD COLUMN coupon_code VARCHAR(20),
ADD COLUMN coupon_discount DECIMAL(10, 2) DEFAULT 0;
```

---

## Error Handling

### Common Error Responses

**Authentication Error:**
```javascript
{
  success: false,
  error: 'Authentication required'
}
```

**Authorization Error:**
```javascript
{
  success: false,
  error: 'Admin access required'
}
```

**Validation Error:**
```javascript
{
  success: false,
  error: 'Invalid input data',
  details: {
    field: 'error message'
  }
}
```

**Not Found Error:**
```javascript
{
  success: false,
  error: 'Coupon not found'
}
```

---

## Usage Examples

### Example 1: Create a Percentage Discount Coupon
```javascript
const response = await createCoupon({
  code: 'SAVE20',
  description: '20% off on orders above ₹1000',
  discount_type: 'percentage',
  discount_value: 20,
  max_discount: 500,
  min_order_value: 1000,
  max_uses: 100,
  max_uses_per_user: 1,
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-12-31T23:59:59Z',
  is_active: true
});
```

### Example 2: Validate Coupon at Checkout
```javascript
const response = await validateCoupon('SAVE20', userId, 2500);

if (response.success && response.data.valid) {
  // Apply discount
  const discount = response.data.discount_amount;
  applyCoupon(response.data, discount);
} else {
  // Show error
  showError(response.data.error);
}
```

### Example 3: Get Available Coupons
```javascript
const response = await getAvailableCoupons(2500);

if (response.success) {
  // Display available coupons
  displayCoupons(response.data);
}
```

---

## Rate Limiting

- Coupon validation: 10 requests per minute per user
- Admin operations: 100 requests per minute

---

## Security Considerations

1. **Admin-only Access**: All admin endpoints require admin role verification
2. **Input Sanitization**: All inputs are sanitized to prevent SQL injection
3. **Code Enumeration Prevention**: Generic error messages for invalid codes
4. **Audit Trail**: All coupon usage is logged in coupon_usage table
5. **Per-user Limits**: Enforced at database level to prevent abuse

---

## Testing

### Test Scenarios

1. **Create Coupon**: Test with valid and invalid data
2. **Validate Coupon**: Test all validation rules
3. **Apply Coupon**: Test discount calculation
4. **Usage Limits**: Test max_uses and max_uses_per_user
5. **Expiry**: Test date range validation
6. **Minimum Order**: Test min_order_value requirement

---

## Support

For issues or questions, contact the development team.

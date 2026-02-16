# Coupon System Design

## Architecture Overview

The coupon system follows a three-tier architecture:
1. **Database Layer**: Supabase PostgreSQL tables
2. **API Layer**: API functions for CRUD operations and validation
3. **UI Layer**: Admin management interface and customer checkout integration

## Database Design

### Tables

#### `coupons` table
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  max_discount DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1 CHECK (max_uses_per_user > 0),
  used_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_percentage CHECK (
    discount_type != 'percentage' OR (discount_value >= 0 AND discount_value <= 100)
  )
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_dates ON coupons(start_date, end_date);
```

#### `coupon_usage` table
```sql
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage(order_id);
```

### Database Functions

#### Validate Coupon Function
```sql
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code VARCHAR,
  p_user_id UUID,
  p_order_total DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER;
  v_discount_amount DECIMAL;
BEGIN
  -- Get coupon details
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code)
  AND is_active = true;

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  -- Check validity period
  IF NOW() < v_coupon.start_date THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon not yet valid');
  END IF;

  IF NOW() > v_coupon.end_date THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;

  -- Check minimum order value
  IF p_order_total < v_coupon.min_order_value THEN
    RETURN json_build_object(
      'valid', false,
      'error', format('Minimum order value of ₹%s required', v_coupon.min_order_value)
    );
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;

  -- Check per-user usage
  SELECT COUNT(*) INTO v_user_usage_count
  FROM coupon_usage
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := (p_order_total * v_coupon.discount_value / 100);
    IF v_coupon.max_discount IS NOT NULL AND v_discount_amount > v_coupon.max_discount THEN
      v_discount_amount := v_coupon.max_discount;
    END IF;
  ELSE
    v_discount_amount := v_coupon.discount_value;
  END IF;

  -- Ensure discount doesn't exceed order total
  IF v_discount_amount > p_order_total THEN
    v_discount_amount := p_order_total;
  END IF;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_discount_amount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$ LANGUAGE plpgsql;
```

## API Design

### File Structure
```
src/api/
  coupons.api.js          # Customer-facing coupon APIs
  admin/
    coupons.admin.api.js  # Admin coupon management APIs
```

### API Functions

#### Customer APIs (`coupons.api.js`)

```javascript
// Validate and get discount for a coupon
export async function validateCoupon(code, userId, orderTotal)

// Get available coupons for current cart
export async function getAvailableCoupons(orderTotal)
```

#### Admin APIs (`coupons.admin.api.js`)

```javascript
// Create new coupon
export async function createCoupon(couponData)

// Get all coupons with filters
export async function getCoupons(filters = {})

// Get single coupon by ID
export async function getCouponById(id)

// Update coupon
export async function updateCoupon(id, couponData)

// Delete coupon
export async function deleteCoupon(id)

// Toggle coupon active status
export async function toggleCouponStatus(id)

// Get coupon usage statistics
export async function getCouponStats(id)
```

## Frontend Design

### Component Structure

```
src/
  pages/
    admin/
      AdminCoupons.jsx           # Main coupon management page
      CouponForm.jsx             # Create/Edit coupon form
  components/
    checkout/
      CouponInput.jsx            # Coupon input field
      AppliedCoupon.jsx          # Display applied coupon
      AvailableCoupons.jsx       # List available coupons
  store/
    useStore.js                  # Add coupon state
  styles/
    admin-coupons.css            # Admin coupon styles
    checkout-coupon.css          # Checkout coupon styles
```

### State Management (Zustand)

```javascript
// Add to useStore.js
{
  // Checkout coupon state
  appliedCoupon: null,
  couponDiscount: 0,
  
  // Actions
  applyCoupon: (coupon, discount) => set({ 
    appliedCoupon: coupon, 
    couponDiscount: discount 
  }),
  removeCoupon: () => set({ 
    appliedCoupon: null, 
    couponDiscount: 0 
  }),
  clearCoupon: () => set({ 
    appliedCoupon: null, 
    couponDiscount: 0 
  }),
}
```

### UI Components

#### AdminCoupons.jsx
- Table view with columns: Code, Type, Discount, Min Order, Validity, Usage, Status, Actions
- Filter buttons: All, Active, Expired, Inactive
- Search bar for coupon code
- "Create Coupon" button
- Edit, Toggle, Delete actions per row

#### CouponForm.jsx
- Form fields:
  - Code (text input, uppercase)
  - Description (textarea)
  - Discount Type (radio: Percentage/Fixed)
  - Discount Value (number input)
  - Max Discount (number input, shown only for percentage)
  - Min Order Value (number input)
  - Max Uses (number input, nullable)
  - Max Uses Per User (number input)
  - Start Date (datetime picker)
  - End Date (datetime picker)
  - Active Status (checkbox)
- Validation messages
- Submit button

#### CouponInput.jsx (Checkout)
- Text input for coupon code
- "Apply" button
- Loading state during validation
- Success/Error message display
- Integrated into checkout page

#### AppliedCoupon.jsx
- Display: Coupon code, discount amount
- "Remove" button
- Success styling

#### AvailableCoupons.jsx
- Collapsible section "Available Coupons"
- List of applicable coupons
- Each coupon shows: Code, Description, Discount, Min Order
- "Apply" button for each
- Empty state if no coupons available

### Checkout Integration

Update `CheckoutOptimized.jsx`:
1. Add coupon input section after address selection
2. Display applied coupon in order summary
3. Update total calculation to include discount
4. Pass coupon info to order creation
5. Clear coupon after successful order

### Order Summary Display

```
Subtotal:        ₹2,500
Shipping:        ₹100
Coupon (SAVE20): -₹500
----------------------------
Total:           ₹2,100
```

## Styling Guidelines

### Admin Coupon Page
- Match existing admin dashboard design
- Use same card/table styles
- Color coding:
  - Active: Green badge
  - Inactive: Gray badge
  - Expired: Red badge
- Responsive table for mobile

### Checkout Coupon Section
- Minimal, clean design
- Input with inline button
- Success: Green background with checkmark
- Error: Red text with icon
- Applied coupon: Light green background

## Validation Logic

### Client-side Validation
- Code format (alphanumeric, 4-20 chars)
- Discount value range
- Date range validity
- Required fields

### Server-side Validation
- All client-side validations
- Unique code check
- Usage limit checks
- Date validity
- User eligibility

## Error Handling

### User-friendly Messages
- "SAVE20 applied! You saved ₹500"
- "Invalid coupon code. Please check and try again."
- "This coupon requires a minimum order of ₹1,000"
- "This coupon has expired on Dec 31, 2024"
- "You've already used this coupon"

### Admin Messages
- "Coupon created successfully"
- "Cannot delete coupon with existing usage"
- "Coupon code already exists"

## Security Considerations

1. **Admin-only Access**: Coupon management requires admin role
2. **Input Sanitization**: Sanitize all inputs to prevent SQL injection
3. **Rate Limiting**: Limit coupon validation attempts
4. **Code Enumeration Prevention**: Generic error messages
5. **Audit Trail**: Log all coupon usage in coupon_usage table

## Performance Optimization

1. **Database Indexes**: On code, active status, dates
2. **Caching**: Cache active coupons list (5 min TTL)
3. **Lazy Loading**: Load coupon list on demand
4. **Debounced Validation**: Debounce coupon input validation

## Testing Strategy

### Unit Tests
- Discount calculation logic
- Validation functions
- Date range checks

### Integration Tests
- Coupon application flow
- Order creation with coupon
- Usage limit enforcement

### Manual Testing
- Create various coupon types
- Apply coupons at checkout
- Test all validation scenarios
- Test admin CRUD operations

## Rollout Plan

### Phase 1: Database & API
1. Create database tables
2. Implement API functions
3. Test API endpoints

### Phase 2: Admin Interface
1. Create admin coupon page
2. Implement CRUD operations
3. Test admin functionality

### Phase 3: Customer Interface
1. Add coupon input to checkout
2. Implement validation
3. Update order flow
4. Test customer experience

### Phase 4: Polish & Launch
1. Add available coupons list
2. Improve error messages
3. Performance optimization
4. Final testing
5. Deploy to production

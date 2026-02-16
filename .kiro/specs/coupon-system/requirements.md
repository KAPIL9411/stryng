# Coupon System Requirements

## Feature Overview
Implement a comprehensive coupon/discount code system similar to Amazon/Flipkart where admins can create and manage coupon codes, and customers can apply them during checkout to receive discounts.

## User Stories

### Admin User Stories

**1. As an admin, I want to create coupon codes**
- So that I can offer discounts to customers
- I can set discount type (percentage or fixed amount)
- I can set minimum order value requirements
- I can set maximum discount cap (for percentage discounts)
- I can set usage limits (total uses and per-user limits)
- I can set validity period (start and end dates)

**2. As an admin, I want to view all coupons**
- So that I can manage existing discount campaigns
- I can see active, expired, and disabled coupons
- I can see usage statistics for each coupon
- I can filter and search coupons

**3. As an admin, I want to edit coupon codes**
- So that I can update campaign details
- I can modify discount values
- I can extend validity periods
- I can change usage limits

**4. As an admin, I want to disable/enable coupons**
- So that I can control when discounts are available
- I can temporarily disable without deleting
- I can reactivate disabled coupons

**5. As an admin, I want to delete coupons**
- So that I can remove outdated campaigns
- System should prevent deletion if coupon has been used

### Customer User Stories

**6. As a customer, I want to apply a coupon code at checkout**
- So that I can get discounts on my order
- I can enter a coupon code in the checkout page
- I can see the discount applied immediately
- I can see the updated total after discount

**7. As a customer, I want to see coupon validation messages**
- So that I know if my coupon is valid
- I see success message when coupon is applied
- I see clear error messages for invalid coupons
- I see why a coupon cannot be applied (expired, minimum not met, etc.)

**8. As a customer, I want to remove an applied coupon**
- So that I can try different coupons
- I can easily remove the current coupon
- The total updates immediately after removal

**9. As a customer, I want to see available coupons**
- So that I know what discounts are available
- I can see a list of applicable coupons
- I can see coupon details (discount, minimum order, validity)

## Acceptance Criteria

### Database Schema

**Coupons Table:**
- `id` (UUID, primary key)
- `code` (string, unique, uppercase)
- `description` (text)
- `discount_type` (enum: 'percentage', 'fixed')
- `discount_value` (decimal)
- `max_discount` (decimal, nullable - for percentage type)
- `min_order_value` (decimal, default 0)
- `max_uses` (integer, nullable - null means unlimited)
- `max_uses_per_user` (integer, default 1)
- `used_count` (integer, default 0)
- `start_date` (timestamp)
- `end_date` (timestamp)
- `is_active` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Coupon Usage Table:**
- `id` (UUID, primary key)
- `coupon_id` (UUID, foreign key)
- `user_id` (UUID, foreign key)
- `order_id` (UUID, foreign key)
- `discount_amount` (decimal)
- `created_at` (timestamp)

### Admin Functionality

**AC1: Create Coupon**
- Admin can access coupon management from admin panel
- Form validates all required fields
- Code is automatically converted to uppercase
- Discount value must be positive
- For percentage: value must be between 0-100
- End date must be after start date
- Success message shown after creation

**AC2: List Coupons**
- Display all coupons in a table
- Show: code, type, value, validity, usage stats, status
- Filter by: active/inactive, expired/valid
- Search by coupon code
- Pagination for large lists

**AC3: Edit Coupon**
- Pre-fill form with existing values
- Cannot change code after creation
- Validation same as create
- Show usage statistics
- Success message after update

**AC4: Toggle Active Status**
- Quick toggle button in list view
- Confirmation for disabling active coupons
- Visual indicator of status

**AC5: Delete Coupon**
- Confirmation dialog before deletion
- Cannot delete if used_count > 0
- Show error message if deletion not allowed

### Customer Functionality

**AC6: Apply Coupon at Checkout**
- Input field for coupon code in checkout page
- "Apply" button to validate and apply
- Case-insensitive code entry
- Real-time validation

**AC7: Coupon Validation**
- Check if coupon exists
- Check if coupon is active
- Check if within validity period
- Check if minimum order value met
- Check if usage limit not exceeded
- Check if user hasn't exceeded per-user limit
- Show specific error for each validation failure

**AC8: Display Discount**
- Show applied coupon code
- Show discount amount
- Show original total
- Show discounted total
- Update order summary

**AC9: Remove Coupon**
- "Remove" button next to applied coupon
- Recalculate totals immediately
- Clear coupon from order

**AC10: Available Coupons List**
- Show applicable coupons based on cart value
- Display: code, description, discount, minimum order
- "Apply" button for each coupon
- Sort by discount value (highest first)

### Validation Rules

**Coupon Code Validation:**
- Must be unique
- 4-20 characters
- Alphanumeric only (A-Z, 0-9)
- No spaces or special characters

**Discount Validation:**
- Percentage: 0-100
- Fixed: Must not exceed reasonable limit (e.g., ₹10,000)
- Max discount (for percentage): Must be positive

**Date Validation:**
- Start date can be in past or future
- End date must be after start date
- Cannot edit dates if coupon is expired

**Usage Validation:**
- Max uses must be positive or null
- Max uses per user must be positive (1-10 recommended)
- Cannot reduce max uses below current used_count

### Error Messages

**Customer-facing:**
- "Invalid coupon code"
- "This coupon has expired"
- "Minimum order value of ₹{amount} required"
- "This coupon has reached its usage limit"
- "You have already used this coupon"
- "Coupon applied successfully! You saved ₹{amount}"

**Admin-facing:**
- "Coupon code already exists"
- "Invalid discount value"
- "End date must be after start date"
- "Cannot delete coupon with existing usage"
- "Coupon created successfully"

## Technical Requirements

### API Endpoints

**Admin:**
- `POST /api/admin/coupons` - Create coupon
- `GET /api/admin/coupons` - List all coupons
- `GET /api/admin/coupons/:id` - Get coupon details
- `PUT /api/admin/coupons/:id` - Update coupon
- `DELETE /api/admin/coupons/:id` - Delete coupon
- `PATCH /api/admin/coupons/:id/toggle` - Toggle active status

**Customer:**
- `POST /api/coupons/validate` - Validate and apply coupon
- `GET /api/coupons/available` - Get available coupons for cart

### Frontend Components

**Admin:**
- `AdminCoupons.jsx` - List view with filters
- `CouponForm.jsx` - Create/Edit form
- Admin navigation link

**Customer:**
- `CouponInput.jsx` - Input field with apply button
- `AppliedCoupon.jsx` - Display applied coupon
- `AvailableCoupons.jsx` - List of available coupons
- Integration in `CheckoutOptimized.jsx`

### State Management
- Add coupon state to Zustand store
- Track applied coupon in checkout
- Clear coupon on order completion

## Non-Functional Requirements

**Performance:**
- Coupon validation should complete in < 200ms
- List page should load in < 500ms

**Security:**
- Admin-only access to coupon management
- Validate all inputs server-side
- Prevent coupon code enumeration attacks

**Usability:**
- Clear error messages
- Responsive design for all screens
- Accessible form controls

## Out of Scope (Future Enhancements)

- Category-specific coupons
- Product-specific coupons
- User-specific coupons (targeted campaigns)
- Auto-apply best coupon
- Coupon stacking (multiple coupons)
- Referral coupons
- First-time user coupons
- Email coupon campaigns

## Success Metrics

- Admins can create coupons in < 2 minutes
- Customers can apply coupons in < 10 seconds
- 0% invalid coupon applications due to UI issues
- Coupon usage tracked accurately

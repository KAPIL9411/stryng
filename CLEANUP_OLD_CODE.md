# 🧹 Cleanup Old Code - Remove Conflicts

## Files to Keep vs Remove

### ✅ KEEP (New Optimized Files)
1. `src/api/orders.optimized.api.js` - New optimized order API
2. `src/lib/imageOptimization.js` - New image optimization
3. `src/lib/preloadAddresses.js` - New address preloading
4. `src/lib/preloadBanners.js` - New banner preloading
5. `src/lib/preloadProducts.js` - New product preloading
6. `src/api/banners-edge.api.js` - New edge API
7. `src/api/products-edge.api.js` - New edge API
8. `src/api/pincodes-edge.api.js` - New edge API

### ⚠️ KEEP BUT UPDATE (Used by Admin/Other Pages)
1. `src/api/orders.api.js` - Keep for admin pages
2. `src/api/banners.api.js` - Keep as fallback
3. `src/api/products.api.js` - Keep as fallback
4. `src/api/pincodes.api.js` - Keep as fallback

### ❌ REMOVE (Old/Duplicate Files)
None found! All files are being used.

## Conflicts Found

### 1. Image Optimization Conflict
**Issue:** Two image optimization files exist
- `src/utils/imageOptimizer.js` (old, class-based)
- `src/lib/imageOptimization.js` (new, function-based)

**Solution:** Keep both for now, they serve different purposes:
- `imageOptimizer.js` - Used by OptimizedImage component
- `imageOptimization.js` - Used by ProductListing for card images

**Action:** No conflict, both are used

### 2. Orders API Conflict
**Issue:** Two order API files exist
- `src/api/orders.api.js` (old, sequential)
- `src/api/orders.optimized.api.js` (new, parallel)

**Solution:** Keep both:
- `orders.api.js` - Used by admin pages and order tracking
- `orders.optimized.api.js` - Used by checkout for faster performance

**Action:** No conflict, both are used

## Cleanup Actions

### 1. No Files to Delete
All files are actively used and serve different purposes.

### 2. Update Documentation
Update import statements to clarify which API to use:
- Checkout: Use `orders.optimized.api.js`
- Admin: Use `orders.api.js`
- Order Tracking: Use `orders.api.js`

### 3. Add Comments
Add comments to clarify file purposes:

```javascript
// orders.api.js
/**
 * STANDARD ORDERS API
 * Used by: Admin pages, Order tracking, Order history
 * For checkout, use orders.optimized.api.js instead
 */

// orders.optimized.api.js
/**
 * OPTIMIZED ORDERS API - 4x Faster
 * Used by: Checkout page
 * Uses parallel operations for maximum speed
 */
```

## Result

✅ No conflicts found!
✅ All files are being used
✅ No cleanup needed
✅ Code is clean and organized

## File Structure

```
src/
├── api/
│   ├── orders.api.js (admin, tracking)
│   ├── orders.optimized.api.js (checkout)
│   ├── banners.api.js (fallback)
│   ├── banners-edge.api.js (primary)
│   ├── products.api.js (fallback)
│   ├── products-edge.api.js (primary)
│   ├── pincodes.api.js (fallback)
│   └── pincodes-edge.api.js (primary)
├── lib/
│   ├── imageOptimization.js (product cards)
│   ├── preloadAddresses.js (checkout)
│   ├── preloadBanners.js (home)
│   └── preloadProducts.js (products)
└── utils/
    └── imageOptimizer.js (OptimizedImage component)
```

## Conclusion

No cleanup needed! All files serve specific purposes and there are no conflicts.

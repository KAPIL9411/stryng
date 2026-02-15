# Route-Based Code Splitting

## Overview

This document describes the route-based code splitting implementation for the e-commerce platform. Code splitting reduces the initial bundle size by loading route components on-demand, improving page load performance.

## Implementation

### Lazy Loading

All route components are loaded using React's `lazy()` function:

```javascript
const Home = lazy(() => import('./pages/Home'));
const ProductListing = lazy(() => import('./pages/ProductListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
// ... and so on for all routes
```

### Suspense Boundaries

The application uses React's `Suspense` component to handle loading states while lazy components are being fetched:

- **Top-level Suspense**: Wraps all routes in `App.jsx` with a full-page loading spinner
- **SuspenseWrapper**: A reusable component that provides consistent loading states across the app

```javascript
<SuspenseWrapper>
  <Routes>
    {/* All routes */}
  </Routes>
</SuspenseWrapper>
```

### Loading States

The `SuspenseWrapper` component uses `LoadingSpinner` to display a consistent loading experience:

- Full-page spinner for route transitions
- Centered layout with loading text
- Customizable size and text

## Components

### Lazy-Loaded Components

**Public Routes:**
- Home
- ProductListing
- ProductDetail
- Cart
- Wishlist
- Login
- Register
- ForgotPassword
- ResetPassword
- VerifyEmail
- NotFound

**Protected Routes:**
- Account
- Addresses
- CheckoutOptimized
- OrderHistory
- OrderTracking

**Admin Routes:**
- AdminDashboard
- AdminProducts
- AdminOrders
- AdminOrderDetails
- AdminBanners
- AdminPincodes
- ProductForm

### Eagerly-Loaded Components

These components are loaded immediately as they're needed for the initial render:

- Layout (Header, Footer)
- ProtectedRoute
- AdminRoute
- ErrorBoundary
- Preloader
- Toast
- SuspenseWrapper
- LoadingSpinner

## Verification

### Manual Testing

1. **Open Browser DevTools**
   - Navigate to the Network tab
   - Filter by JS files
   - Clear the network log

2. **Navigate to Different Routes**
   - Start at the home page
   - Navigate to `/products`
   - Navigate to `/cart`
   - Navigate to a product detail page

3. **Observe Network Requests**
   - Each route navigation should trigger a new JS chunk download
   - Chunk files will be named like `ProductListing-[hash].js`
   - Subsequent visits to the same route should use cached chunks

### Build Analysis

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Check Output**
   - Look for multiple JS chunks in `dist/assets/`
   - Each lazy-loaded component should have its own chunk
   - Verify total bundle size is under 500KB (compressed)

3. **Analyze Bundle**
   - Main bundle should contain only core dependencies
   - Route-specific code should be in separate chunks
   - Vendor code should be split into logical chunks

### Performance Metrics

Expected improvements from code splitting:

- **Initial Bundle Size**: Reduced by 60-70%
- **First Contentful Paint**: Improved by 30-40%
- **Time to Interactive**: Improved by 40-50%
- **Lighthouse Performance Score**: Should be > 90

## Troubleshooting

### Issue: Loading spinner flashes too quickly

**Solution**: Add a minimum display time for the loading spinner:

```javascript
const [showSpinner, setShowSpinner] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setShowSpinner(true), 200);
  return () => clearTimeout(timer);
}, []);
```

### Issue: Chunks fail to load

**Possible Causes**:
- Network issues
- Incorrect base path in Vite config
- CDN caching issues

**Solution**: Implement error boundary with retry logic

### Issue: Large chunk sizes

**Solution**: Further split large components or use dynamic imports for heavy dependencies

## Best Practices

1. **Lazy Load Routes**: Always use `lazy()` for route components
2. **Eager Load Critical Components**: Don't lazy load layout, auth, or error handling components
3. **Consistent Loading States**: Use `SuspenseWrapper` for uniform UX
4. **Error Boundaries**: Wrap lazy components in error boundaries
5. **Preload Critical Routes**: Consider preloading frequently accessed routes
6. **Monitor Bundle Size**: Regularly check chunk sizes in production builds

## Future Improvements

1. **Component-Level Code Splitting**: Split large components within routes
2. **Prefetching**: Preload routes on hover or based on user behavior
3. **Progressive Loading**: Load above-the-fold content first
4. **Service Worker Caching**: Cache chunks for offline access
5. **Dynamic Imports**: Use dynamic imports for heavy libraries (charts, editors)

## Related Files

- `src/App.jsx` - Main routing configuration
- `src/components/common/SuspenseWrapper.jsx` - Reusable Suspense wrapper
- `src/components/common/LoadingSpinner.jsx` - Loading state component
- `vite.config.js` - Build configuration for code splitting

## Requirements Validation

This implementation satisfies:

- **Requirement 3.4**: Lazy load route-specific code ✓
- **Requirement 3.6**: Implement code splitting for routes ✓
- **Requirement 3.3**: Reduce bundle size to under 500KB ✓

## References

- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)

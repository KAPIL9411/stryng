# Project Structure - Clean & Organized

## 📁 Root Directory

```
stryngkiro/
├── public/                    # Static assets
├── src/                       # Source code
├── docs/                      # Documentation
├── scripts/                   # Build & utility scripts
├── .env                       # Environment variables
├── .env.local                 # Local environment overrides
├── index.html                 # HTML entry point
├── package.json               # Dependencies
├── vite.config.js             # Vite configuration
├── vitest.config.js           # Test configuration
├── database-optimizations-ultra-fast.sql  # Database setup
└── README.md                  # Project documentation
```

## 📂 Source Structure (`src/`)

### API Layer (`src/api/`)
Handles all backend communication with Supabase.

```
api/
├── addresses.api.js           # Address management
├── banners.api.js             # Banner CRUD operations
├── batch.api.js               # Batch operations
├── dashboard.enterprise.api.js # Admin dashboard data
├── orders.api.js              # Order management
├── pincodes.api.js            # Pincode serviceability
└── products.api.js            # Product CRUD & queries
```

**Key Features:**
- Ultra-fast in-memory caching
- Optimized queries with minimal field selection
- Error handling and performance monitoring
- Atomic operations for data integrity

### Components (`src/components/`)

```
components/
├── admin/                     # Admin-specific components
│   ├── AdminLayout.jsx        # Admin page layout
│   └── ImageUpload.jsx        # Image upload component
├── auth/                      # Authentication components
│   └── PasswordStrength.jsx   # Password strength indicator
├── common/                    # Reusable components
│   ├── EmptyState.jsx         # Empty state UI
│   ├── ErrorMessage.jsx       # Error display
│   ├── LoadingSpinner.jsx     # Loading indicator
│   ├── ProductCard.jsx        # Product card component
│   └── StatusBadge.jsx        # Status badge
├── layout/                    # Layout components
│   ├── Footer.jsx             # Site footer
│   ├── Header.jsx             # Site header
│   └── Layout.jsx             # Main layout wrapper
├── ui/                        # UI primitives
│   ├── Alert.jsx              # Alert component
│   ├── Badge.jsx              # Badge component
│   ├── Button.jsx             # Button component
│   ├── Card.jsx               # Card component
│   ├── Dropdown.jsx           # Dropdown component
│   ├── Input.jsx              # Input component
│   ├── Modal.jsx              # Modal component
│   ├── Preloader.jsx          # Page preloader
│   ├── ProductSkeleton.jsx    # Product loading skeleton
│   ├── Spinner.jsx            # Spinner component
│   └── Toast.jsx              # Toast notifications
├── AdminRoute.jsx             # Admin route guard
├── ErrorBoundary.jsx          # Error boundary
├── OptimizedImage.jsx         # Optimized image component
├── PincodeChecker.jsx         # Pincode checker widget
├── ProtectedRoute.jsx         # Auth route guard
└── SEO.jsx                    # SEO meta tags
```

### Hooks (`src/hooks/`)
Custom React hooks for data fetching and state management.

```
hooks/
├── useBanners.js              # Banner data hook
├── useDebounce.js             # Debounce hook
├── useInfiniteScroll.js       # Infinite scroll hook
├── useProducts.js             # Product data hooks (consolidated)
└── useVirtualScroll.js        # Virtual scrolling hook
```

**Available Hooks:**
- `useProducts(page, limit, filters)` - Paginated products
- `useProduct(slug)` - Single product
- `useAllProducts()` - All products (cached)
- `usePrefetchProducts()` - Prefetch next page
- `useProductsByIds(ids)` - Batch fetch by IDs
- `useTrendingProducts(limit)` - Trending products
- `useInvalidateProducts()` - Cache invalidation

### Pages (`src/pages/`)

```
pages/
├── admin/                     # Admin pages
│   ├── AdminBanners.jsx       # Banner management
│   ├── AdminDashboard.jsx     # Admin dashboard
│   ├── AdminOrderDetails.jsx  # Order details
│   ├── AdminOrders.jsx        # Order management
│   ├── AdminPincodes.jsx      # Pincode management
│   ├── AdminProducts.jsx      # Product management
│   └── ProductForm.jsx        # Product create/edit
├── Account.jsx                # User account page
├── Addresses.jsx              # Address management
├── Cart.jsx                   # Shopping cart
├── CheckoutOptimized.jsx      # Checkout flow
├── ForgotPassword.jsx         # Password reset request
├── Home.jsx                   # Homepage
├── Login.jsx                  # Login page
├── NotFound.jsx               # 404 page
├── OrderHistory.jsx           # Order history
├── OrderTracking.jsx          # Order tracking
├── ProductDetail.jsx          # Product detail page
├── ProductListing.jsx         # Product listing with filters
├── Register.jsx               # Registration page
├── ResetPassword.jsx          # Password reset
├── VerifyEmail.jsx            # Email verification
└── Wishlist.jsx               # Wishlist page
```

### Services (`src/services/`)
Business logic and external service integrations.

```
services/
├── InMemoryCacheService.js    # In-memory caching
├── RateLimiter.js             # Rate limiting
└── RedisCacheService.js       # Redis caching (optional)
```

### Utilities (`src/utils/`)
Helper functions and utilities.

```
utils/
├── apiHelpers.js              # API error handling & monitoring
├── constants.js               # App constants
├── format.js                  # Formatting utilities
├── helpers.js                 # General helpers
├── imageOptimizer.js          # Image optimization
├── queryMonitor.js            # Query performance monitoring
├── rateLimitMiddleware.js     # Rate limit middleware
├── reportWebVitals.js         # Web vitals tracking
└── validation.js              # Form validation
```

### Library (`src/lib/`)
Core functionality and configurations.

```
lib/
├── analytics.js               # Analytics tracking
├── imageOptimization.js       # Image optimization config
├── inventory.js               # Inventory helpers
├── performance.js             # Performance monitoring
├── queryClient.js             # React Query config
├── redis.js                   # Redis client (optional)
├── secureImageUpload.js       # Secure image uploads
└── supabaseClient.js          # Supabase client
```

### Styles (`src/styles/`)
CSS modules and styling.

```
styles/
├── admin.css                  # Admin styles
├── components.css             # Component styles
├── global.css                 # Global styles
├── header-footer.css          # Header/footer styles
├── layout.css                 # Layout styles
├── pages.css                  # Page-specific styles
├── tokens.js                  # Design tokens
├── utilities.css              # Utility classes
└── variables.css              # CSS variables
```

### Store (`src/store/`)
Global state management.

```
store/
└── useStore.js                # Zustand store
```

**Store Features:**
- User authentication state
- Cart management
- Wishlist management
- Toast notifications
- Admin role checking

### Configuration (`src/config/`)

```
config/
└── constants.js               # App-wide constants
```

## 🗄️ Database Structure

### Tables
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `profiles` - User profiles
- `customer_addresses` - Delivery addresses
- `serviceable_pincodes` - Pincode serviceability
- `banners` - Homepage banners
- `inventory_reservations` - Stock reservations
- `stock_movements` - Inventory audit trail
- `low_stock_alerts` - Low stock notifications

### Key Features
- Optimized indexes for fast queries
- Materialized views for dashboards
- Atomic operations for data integrity
- Row-level security (RLS)
- Inventory reservation system

## 🚀 Performance Optimizations

### Frontend
- ✅ Lazy loading for all routes
- ✅ Code splitting by route
- ✅ In-memory caching (5-15min TTL)
- ✅ Image optimization (WebP format)
- ✅ Virtual scrolling for large lists
- ✅ Debounced search inputs
- ✅ Prefetching for next pages
- ✅ React Query for data caching

### Backend
- ✅ Minimal field selection (70% payload reduction)
- ✅ Composite indexes on common queries
- ✅ GIN indexes for full-text search
- ✅ Materialized views for dashboards
- ✅ Connection pooling
- ✅ Query performance monitoring

### Caching Strategy
1. **In-Memory Cache** (Primary)
   - Products: 5 minutes
   - Product details: 10 minutes
   - Trending: 15 minutes
   - All products: 10 minutes

2. **React Query Cache** (Secondary)
   - Automatic background refetching
   - Stale-while-revalidate pattern
   - Optimistic updates

## 📝 Code Standards

### Naming Conventions
- **Components**: PascalCase (`ProductCard.jsx`)
- **Hooks**: camelCase with `use` prefix (`useProducts.js`)
- **Utils**: camelCase (`formatPrice.js`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)
- **CSS Classes**: kebab-case (`product-card`)

### File Organization
- One component per file
- Co-locate styles with components
- Group related utilities
- Separate business logic from UI

### Import Order
1. React & external libraries
2. Internal components
3. Hooks
4. Utils & helpers
5. Styles
6. Types (if using TypeScript)

## 🧪 Testing

### Test Files Location
- Unit tests: `__tests__/` folder or `.test.js` suffix
- Integration tests: `src/test/` folder
- E2E tests: `cypress/` or `playwright/` folder

### Test Setup
- Vitest for unit tests
- React Testing Library for component tests
- Test setup in `src/test/setup.js`

## 📦 Build & Deployment

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Production
- Build output: `dist/` folder
- Optimized bundles with code splitting
- Minified CSS and JS
- Compressed assets

## 🔒 Security

### Authentication
- Supabase Auth for user management
- JWT tokens for API authentication
- Row-level security (RLS) in database
- Protected routes with guards

### Data Protection
- Environment variables for secrets
- HTTPS only in production
- Input validation and sanitization
- XSS protection
- CSRF protection

## 📊 Monitoring

### Performance
- Web Vitals tracking
- Query performance monitoring
- API response time tracking
- Cache hit rate monitoring

### Analytics
- Page view tracking
- Product view tracking
- Checkout funnel tracking
- Error tracking

## 🎯 Key Features

### User Features
- Product browsing with filters
- Search functionality
- Shopping cart
- Wishlist
- User authentication
- Order tracking
- Address management
- Pincode serviceability check

### Admin Features
- Product management (CRUD)
- Order management
- Banner management
- Pincode management
- Dashboard with statistics
- Inventory tracking

## 📚 Documentation

- `README.md` - Project overview
- `docs/` - Detailed documentation
- `PROJECT_STRUCTURE.md` - This file
- Inline code comments
- JSDoc for functions

---

**Last Updated:** February 15, 2026
**Status:** ✅ Clean, Organized, Production-Ready

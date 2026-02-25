# Android App Design - Stryng Clothing

## Architecture Overview

### Technology Stack
```
┌─────────────────────────────────────────┐
│         React Native App                │
├─────────────────────────────────────────┤
│  UI Layer (Screens & Components)        │
│  - React Native Paper Components        │
│  - Custom Components                    │
│  - Navigation (React Navigation)        │
├─────────────────────────────────────────┤
│  State Management (Zustand)             │
│  - User State                           │
│  - Cart State                           │
│  - Product State                        │
│  - Order State                          │
├─────────────────────────────────────────┤
│  Business Logic Layer                   │
│  - API Services                         │
│  - Data Transformers                    │
│  - Validators                           │
├─────────────────────────────────────────┤
│  Data Layer                             │
│  - Supabase Client                      │
│  - AsyncStorage (Local Cache)           │
│  - Image Cache                          │
├─────────────────────────────────────────┤
│  Native Modules                         │
│  - Biometric Auth                       │
│  - Push Notifications (FCM)             │
│  - Deep Links                           │
│  - Image Picker                         │
└─────────────────────────────────────────┘
```

## Project Structure

```
stryng-android/
├── android/                    # Native Android code
├── ios/                        # Native iOS code (future)
├── src/
│   ├── api/                   # API service layer
│   │   ├── auth.api.js
│   │   ├── products.api.js
│   │   ├── orders.api.js
│   │   ├── coupons.api.js
│   │   └── addresses.api.js
│   ├── components/            # Reusable components
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── product/
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   └── ProductFilter.jsx
│   │   ├── cart/
│   │   │   ├── CartItem.jsx
│   │   │   └── CartSummary.jsx
│   │   └── checkout/
│   │       ├── AddressCard.jsx
│   │       ├── CouponInput.jsx
│   │       └── PaymentQR.jsx
│   ├── screens/               # App screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── RegisterScreen.jsx
│   │   │   └── ForgotPasswordScreen.jsx
│   │   ├── home/
│   │   │   └── HomeScreen.jsx
│   │   ├── products/
│   │   │   ├── ProductListScreen.jsx
│   │   │   └── ProductDetailScreen.jsx
│   │   ├── cart/
│   │   │   └── CartScreen.jsx
│   │   ├── checkout/
│   │   │   └── CheckoutScreen.jsx
│   │   ├── orders/
│   │   │   ├── OrderHistoryScreen.jsx
│   │   │   └── OrderDetailScreen.jsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.jsx
│   │   │   └── AddressesScreen.jsx
│   │   └── admin/
│   │       ├── AdminDashboardScreen.jsx
│   │       ├── AdminProductsScreen.jsx
│   │       ├── AdminOrdersScreen.jsx
│   │       └── AdminCouponsScreen.jsx
│   ├── navigation/            # Navigation configuration
│   │   ├── AppNavigator.jsx
│   │   ├── AuthNavigator.jsx
│   │   ├── MainNavigator.jsx
│   │   └── AdminNavigator.jsx
│   ├── store/                 # Zustand stores
│   │   ├── useAuthStore.js
│   │   ├── useCartStore.js
│   │   ├── useProductStore.js
│   │   └── useOrderStore.js
│   ├── utils/                 # Utility functions
│   │   ├── format.js
│   │   ├── validation.js
│   │   ├── storage.js
│   │   └── constants.js
│   ├── hooks/                 # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useProducts.js
│   │   └── useOrders.js
│   ├── config/                # Configuration
│   │   ├── supabase.js
│   │   ├── firebase.js
│   │   └── env.js
│   ├── assets/                # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   └── App.jsx                # Root component
├── __tests__/                 # Test files
├── .env                       # Environment variables
├── app.json                   # App configuration
├── package.json
└── README.md
```

## Screen Designs

### 1. Authentication Flow

#### Login Screen
```
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│      [LOGO]                 │
│                             │
│  Welcome Back!              │
│  Login to your account      │
│                             │
│  ┌─────────────────────┐   │
│  │ Email               │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Password      [👁]  │   │
│  └─────────────────────┘   │
│                             │
│  Forgot Password?           │
│                             │
│  ┌─────────────────────┐   │
│  │      LOGIN          │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  [👆] Use Biometric │   │
│  └─────────────────────┘   │
│                             │
│  Don't have an account?     │
│  Sign Up                    │
└─────────────────────────────┘
```

### 2. Home Screen
```
┌─────────────────────────────┐
│  [☰]  Stryng    [🔍] [🛒]  │
├─────────────────────────────┤
│  ┌───────────────────────┐ │
│  │   Banner Carousel     │ │
│  │   [● ○ ○]            │ │
│  └───────────────────────┘ │
│                             │
│  Categories                 │
│  [Shirts] [Pants] [T-Shirts]│
│                             │
│  Featured Products          │
│  ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ Img │ │ Img │ │ Img │  │
│  │ $99 │ │ $79 │ │ $89 │  │
│  └─────┘ └─────┘ └─────┘  │
│                             │
│  New Arrivals               │
│  ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ Img │ │ Img │ │ Img │  │
│  │ $99 │ │ $79 │ │ $89 │  │
│  └─────┘ └─────┘ └─────┘  │
└─────────────────────────────┘
│  [🏠] [📦] [❤️] [👤]       │
└─────────────────────────────┘
```

### 3. Product List Screen
```
┌─────────────────────────────┐
│  ← Products    [🔍] [⚙️]   │
├─────────────────────────────┤
│  [Filter] [Sort: Price ▼]  │
├─────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ │
│  │  Image   │ │  Image   │ │
│  │  Name    │ │  Name    │ │
│  │  ₹999    │ │  ₹799    │ │
│  │  [❤️]    │ │  [❤️]    │ │
│  └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ │
│  │  Image   │ │  Image   │ │
│  │  Name    │ │  Name    │ │
│  │  ₹899    │ │  ₹699    │ │
│  │  [❤️]    │ │  [❤️]    │ │
│  └──────────┘ └──────────┘ │
│  ... (infinite scroll)      │
└─────────────────────────────┘
│  [🏠] [📦] [❤️] [👤]       │
└─────────────────────────────┘
```

### 4. Product Detail Screen
```
┌─────────────────────────────┐
│  ← Back        [🔍] [❤️]    │
├─────────────────────────────┤
│  ┌───────────────────────┐ │
│  │   Product Image       │ │
│  │   [Swipe Gallery]     │ │
│  │   [● ○ ○ ○]          │ │
│  └───────────────────────┘ │
│                             │
│  Product Name               │
│  ⭐⭐⭐⭐⭐ (4.5) 120 reviews│
│                             │
│  ₹999  ₹1299 (23% OFF)     │
│                             │
│  Select Size                │
│  [S] [M] [L] [XL] [XXL]    │
│                             │
│  Select Color               │
│  [⚫] [⚪] [🔴] [🔵]        │
│                             │
│  Description                │
│  Lorem ipsum dolor sit...   │
│                             │
│  ┌─────────────────────┐   │
│  │   ADD TO CART       │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │   BUY NOW           │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 5. Cart Screen
```
┌─────────────────────────────┐
│  ← Cart (3 items)           │
├─────────────────────────────┤
│  ┌───────────────────────┐ │
│  │ [Img] Product Name    │ │
│  │       Size: M, Black  │ │
│  │       ₹999            │ │
│  │       [-] 1 [+]  [🗑] │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ [Img] Product Name    │ │
│  │       Size: L, White  │ │
│  │       ₹799            │ │
│  │       [-] 2 [+]  [🗑] │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │ [🎫] Apply Coupon     │ │
│  └───────────────────────┘ │
│                             │
│  Price Details              │
│  Subtotal        ₹2,597     │
│  Discount        -₹200      │
│  Shipping        FREE       │
│  Tax (18%)       ₹432       │
│  ─────────────────────────  │
│  Total           ₹2,829     │
│                             │
│  ┌─────────────────────┐   │
│  │   CHECKOUT          │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 6. Checkout Screen
```
┌─────────────────────────────┐
│  ← Checkout                 │
├─────────────────────────────┤
│  [1] Address → [2] Payment  │
│                             │
│  Delivery Address           │
│  ┌───────────────────────┐ │
│  │ ✓ John Doe           │ │
│  │   123 Main St        │ │
│  │   City, State 12345  │ │
│  │   📞 9876543210      │ │
│  └───────────────────────┘ │
│  [+ Add New Address]        │
│                             │
│  Order Summary (3 items)    │
│  ┌───────────────────────┐ │
│  │ [Img] Product x1      │ │
│  │ [Img] Product x2      │ │
│  └───────────────────────┘ │
│                             │
│  Price Details              │
│  Total: ₹2,829              │
│                             │
│  ┌─────────────────────┐   │
│  │   PROCEED TO PAY    │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 7. Payment Screen
```
┌─────────────────────────────┐
│  ← Payment                  │
├─────────────────────────────┤
│  Order #ORD-123456          │
│  Amount: ₹2,829             │
│                             │
│  Scan QR Code               │
│  ┌───────────────────────┐ │
│  │                       │ │
│  │    [QR CODE]          │ │
│  │                       │ │
│  └───────────────────────┘ │
│  Scan with any UPI app      │
│                             │
│  ─────── OR ───────         │
│                             │
│  Pay via UPI ID             │
│  ┌───────────────────────┐ │
│  │ merchant@upi  [📋]    │ │
│  └───────────────────────┘ │
│  ┌─────────────────────┐   │
│  │   OPEN UPI APP      │   │
│  └─────────────────────┘   │
│                             │
│  After Payment              │
│  ┌───────────────────────┐ │
│  │ Transaction ID        │ │
│  │ (Optional)            │ │
│  └───────────────────────┘ │
│  ┌─────────────────────┐   │
│  │   I HAVE PAID       │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 8. Order History Screen
```
┌─────────────────────────────┐
│  ← My Orders                │
├─────────────────────────────┤
│  [All] [Pending] [Delivered]│
├─────────────────────────────┤
│  ┌───────────────────────┐ │
│  │ Order #ORD-123456     │ │
│  │ 3 items • ₹2,829      │ │
│  │ Delivered on 15 Jan   │ │
│  │ [View Details]        │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ Order #ORD-123455     │ │
│  │ 2 items • ₹1,599      │ │
│  │ 🚚 In Transit         │ │
│  │ [Track Order]         │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ Order #ORD-123454     │ │
│  │ 1 item • ₹999         │ │
│  │ ⏳ Pending Payment    │ │
│  │ [Complete Payment]    │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
│  [🏠] [📦] [❤️] [👤]       │
└─────────────────────────────┘
```

### 9. Profile Screen
```
┌─────────────────────────────┐
│  ← Profile                  │
├─────────────────────────────┤
│      [Profile Photo]        │
│      John Doe               │
│      john@example.com       │
│                             │
│  ┌───────────────────────┐ │
│  │ 📦 My Orders          │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 📍 Addresses          │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ ❤️ Wishlist           │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 🎫 My Coupons         │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ ⚙️ Settings           │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 📞 Support            │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 🚪 Logout             │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
│  [🏠] [📦] [❤️] [👤]       │
└─────────────────────────────┘
```

## Data Flow

### Authentication Flow
```
User Input → Validation → API Call → Supabase Auth
                                    ↓
                              Store Token
                                    ↓
                              Update Store
                                    ↓
                            Navigate to Home
```

### Product Browsing Flow
```
Screen Load → Check Cache → Cache Hit? → Display Data
                    ↓              ↓
                Cache Miss    Background Refresh
                    ↓              ↓
              API Call → Supabase → Update Cache
                    ↓
              Display Data
```

### Cart Flow
```
Add to Cart → Update Store → Save to AsyncStorage
                    ↓
              Update UI (Optimistic)
                    ↓
              Sync with Backend (if online)
```

### Checkout Flow
```
Select Address → Review Order → Initiate Payment
                                      ↓
                              Generate QR/UPI Link
                                      ↓
                              User Pays
                                      ↓
                              Enter Transaction ID
                                      ↓
                              Create Order → Supabase
                                      ↓
                              Clear Cart
                                      ↓
                              Show Confirmation
```

## State Management

### Auth Store
```javascript
{
  user: null | User,
  isAuthenticated: boolean,
  isLoading: boolean,
  login: (email, password) => Promise,
  register: (data) => Promise,
  logout: () => Promise,
  updateProfile: (data) => Promise
}
```

### Cart Store
```javascript
{
  items: CartItem[],
  appliedCoupon: Coupon | null,
  discount: number,
  addItem: (product, size, color, quantity) => void,
  removeItem: (cartId) => void,
  updateQuantity: (cartId, quantity) => void,
  applyCoupon: (code) => Promise,
  removeCoupon: () => void,
  clearCart: () => void,
  getTotal: () => number
}
```

### Product Store
```javascript
{
  products: Product[],
  categories: Category[],
  filters: Filters,
  isLoading: boolean,
  fetchProducts: (filters) => Promise,
  fetchProductById: (id) => Promise,
  setFilters: (filters) => void
}
```

## API Integration

### Reuse Existing APIs
All existing API functions from the web app will be reused:
- `src/api/auth.api.js`
- `src/api/products.api.js`
- `src/api/orders.api.js`
- `src/api/coupons.api.js`
- `src/api/addresses.api.js`

### Supabase Configuration
```javascript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);
```

## Performance Optimizations

### Image Optimization
- Use React Native Fast Image for caching
- Progressive image loading with placeholders
- Lazy loading in lists
- Image compression before upload

### List Performance
- Use FlatList with optimized props
- Implement pagination/infinite scroll
- Use memo for list items
- Virtualization for long lists

### Network Optimization
- Request batching
- Response caching
- Retry logic with exponential backoff
- Offline queue for mutations

### App Size Optimization
- Code splitting
- Remove unused dependencies
- Optimize images
- Use ProGuard for Android

## Security Considerations

### Data Security
- Encrypt sensitive data in AsyncStorage
- Use HTTPS for all API calls
- Implement certificate pinning
- Secure token storage

### Authentication
- Biometric authentication
- Session timeout
- Refresh token rotation
- Secure password storage

### Payment Security
- Never store payment info
- Use UPI deep links (no card data)
- Verify transactions server-side
- Implement fraud detection

## Testing Strategy

### Unit Tests
- Business logic functions
- Utility functions
- Store actions
- API services

### Integration Tests
- API integration
- Navigation flows
- State management
- Data persistence

### E2E Tests
- Complete user flows
- Critical paths (checkout, payment)
- Cross-screen interactions
- Error scenarios

## Deployment

### Build Configuration
- Development build
- Staging build
- Production build
- Different API endpoints per environment

### Release Process
1. Version bump
2. Generate signed APK
3. Test on multiple devices
4. Upload to Play Store (Internal Testing)
5. Beta testing
6. Production release

### Monitoring
- Crash reporting (Firebase Crashlytics)
- Analytics (Firebase Analytics)
- Performance monitoring
- User feedback collection

## Future Enhancements
- iOS version
- Social login
- In-app chat
- Product reviews
- Multiple payment methods
- Dark mode
- Multi-language support
- AR try-on feature

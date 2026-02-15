/**
 * Application Constants
 * Central location for all constant values used throughout the app
 * @module config/constants
 */

// ========================================
// PAGINATION
// ========================================
export const PRODUCTS_PER_PAGE = 24;
export const ORDERS_PER_PAGE = 10;
export const DEFAULT_PAGE = 1;

// ========================================
// CACHE DURATIONS (milliseconds)
// ========================================
export const CACHE_DURATION = {
  PRODUCTS: 5 * 60 * 1000, // 5 minutes
  BANNERS: 10 * 60 * 1000, // 10 minutes
  USER_PROFILE: 15 * 60 * 1000, // 15 minutes
  ORDERS: 2 * 60 * 1000, // 2 minutes
};

// ========================================
// DEBOUNCE DELAYS (milliseconds)
// ========================================
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  INPUT: 500,
  SCROLL: 100,
};

// ========================================
// IMAGE SIZES
// ========================================
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 200, height: 250 },
  CARD: { width: 400, height: 500 },
  DETAIL: { width: 800, height: 1000 },
  HERO: { width: 1200, height: 800 },
};

// ========================================
// BREAKPOINTS (pixels)
// ========================================
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
  WIDE: 1536,
};

// ========================================
// ROUTES
// ========================================
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:slug',
  CART: '/cart',
  WISHLIST: '/wishlist',
  CHECKOUT: '/checkout',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // User
  ACCOUNT: '/account',
  ORDER_TRACKING: '/order/:id',

  // Admin
  ADMIN: '/admin',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_PRODUCT_NEW: '/admin/products/new',
  ADMIN_PRODUCT_EDIT: '/admin/products/:id/edit',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ORDER_DETAIL: '/admin/orders/:id',
  ADMIN_BANNERS: '/admin/banners',

  // Other
  NOT_FOUND: '*',
};

// ========================================
// ORDER STATUS
// ========================================
export const ORDER_STATUS = {
  PENDING: 'pending',
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.PLACED]: 'Order Placed',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.PROCESSING]: 'Processing',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.REFUNDED]: 'Refunded',
};

// ========================================
// PAYMENT STATUS
// ========================================
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  VERIFICATION_PENDING: 'verification_pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// ========================================
// PAYMENT METHODS
// ========================================
export const PAYMENT_METHODS = {
  COD: 'cod',
  UPI: 'upi',
  CARD: 'card',
  NET_BANKING: 'net_banking',
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.COD]: 'Cash on Delivery',
  [PAYMENT_METHODS.UPI]: 'UPI',
  [PAYMENT_METHODS.CARD]: 'Credit/Debit Card',
  [PAYMENT_METHODS.NET_BANKING]: 'Net Banking',
};

// ========================================
// PRODUCT CATEGORIES
// ========================================
export const CATEGORIES = {
  T_SHIRTS: 't-shirts',
  SHIRTS: 'shirts',
  TROUSERS: 'trousers',
  HOODIES: 'hoodies',
  JACKETS: 'jackets',
};

// ========================================
// SIZES
// ========================================
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ========================================
// COLORS
// ========================================
export const COLORS = [
  { name: 'Black', hex: '#0A0A0A' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Green', hex: '#1B4332' },
  { name: 'Blue', hex: '#4A90D9' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Gray', hex: '#808080' },
];

// ========================================
// SORT OPTIONS
// ========================================
export const SORT_OPTIONS = {
  RECOMMENDED: 'recommended',
  PRICE_LOW: 'price-low',
  PRICE_HIGH: 'price-high',
  NEWEST: 'newest',
  POPULARITY: 'popularity',
};

export const SORT_LABELS = {
  [SORT_OPTIONS.RECOMMENDED]: 'Recommended',
  [SORT_OPTIONS.PRICE_LOW]: 'Price: Low to High',
  [SORT_OPTIONS.PRICE_HIGH]: 'Price: High to Low',
  [SORT_OPTIONS.NEWEST]: 'Newest First',
  [SORT_OPTIONS.POPULARITY]: 'Popularity',
};

// ========================================
// VALIDATION
// ========================================
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PHONE_LENGTH: 10,
  PIN_CODE_LENGTH: 6,
  MAX_CART_QUANTITY: 10,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// ========================================
// TOAST TYPES
// ========================================
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
};

// ========================================
// LOCAL STORAGE KEYS
// ========================================
export const STORAGE_KEYS = {
  CART: 'stryng-cart',
  WISHLIST: 'stryng-wishlist',
  USER: 'stryng-user',
  AB_TESTS: 'ab_test_variants',
  THEME: 'stryng-theme',
};

// ========================================
// API ENDPOINTS (Supabase tables)
// ========================================
export const API_ENDPOINTS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  BANNERS: 'banners',
  PROFILES: 'profiles',
};

// ========================================
// ERROR MESSAGES
// ========================================
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  AUTH_REQUIRED: 'Please login to continue.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
  PRODUCT_NOT_FOUND: 'Product not found.',
  OUT_OF_STOCK: 'This product is out of stock.',
  CART_EMPTY: 'Your cart is empty.',
  INVALID_INPUT: 'Please check your input and try again.',
};

// ========================================
// SUCCESS MESSAGES
// ========================================
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  REGISTER: 'Account created successfully!',
  LOGOUT: 'Logged out successfully.',
  PRODUCT_ADDED: 'Product added to cart.',
  PRODUCT_REMOVED: 'Product removed from cart.',
  WISHLIST_ADDED: 'Added to wishlist.',
  WISHLIST_REMOVED: 'Removed from wishlist.',
  ORDER_PLACED: 'Order placed successfully!',
  PASSWORD_UPDATED: 'Password updated successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
};

// ========================================
// ANALYTICS EVENTS
// ========================================
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  VIEW_ITEM: 'view_item',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  BEGIN_CHECKOUT: 'begin_checkout',
  PURCHASE: 'purchase',
  SEARCH: 'search',
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
};

// ========================================
// FEATURE FLAGS
// ========================================
export const FEATURE_FLAGS = {
  USE_INFINITE_SCROLL: true,
  ENABLE_AB_TESTING: true,
  ENABLE_SERVICE_WORKER: true,
  ENABLE_ANALYTICS: true,
  ENABLE_PERFORMANCE_MONITORING: true,
};

// ========================================
// ENVIRONMENT
// ========================================
export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;

// ========================================
// REGEX PATTERNS
// ========================================
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[6-9]\d{9}$/,
  PIN_CODE: /^\d{6}$/,
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// ========================================
// CORE WEB VITALS THRESHOLDS
// ========================================
export const WEB_VITALS = {
  LCP: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
  },
  FID: {
    GOOD: 100,
    NEEDS_IMPROVEMENT: 300,
  },
  CLS: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25,
  },
  FCP: {
    GOOD: 1800,
    NEEDS_IMPROVEMENT: 3000,
  },
  TTFB: {
    GOOD: 800,
    NEEDS_IMPROVEMENT: 1800,
  },
};

// ========================================
// A/B TEST EXPERIMENTS
// ========================================
export const AB_EXPERIMENTS = {
  PRODUCT_LISTING_PAGINATION: 'product_listing_pagination',
  PRODUCTS_PER_PAGE: 'products_per_page',
  IMAGE_SIZE: 'product_image_size',
  CAROUSEL_SPEED: 'hero_carousel_speed',
  SEARCH_DEBOUNCE: 'search_debounce_delay',
};

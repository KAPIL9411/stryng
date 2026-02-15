/**
 * Shared Constants
 * Centralized constants used across the application
 */

// Regex patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[6-9]\d{9}$/,
  PIN_CODE: /^\d{6}$/,
};

// Validation rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PHONE_LENGTH: 10,
  PIN_CODE_LENGTH: 6,
  MAX_CART_QUANTITY: 10,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Status configurations
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'processing', label: 'Processing', color: '#3b82f6' },
  { value: 'shipped', label: 'Shipped', color: '#8b5cf6' },
  { value: 'delivered', label: 'Delivered', color: '#10b981' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'verification_pending', label: 'Verifying', color: '#f97316' },
  { value: 'paid', label: 'Paid', color: '#10b981' },
  { value: 'failed', label: 'Failed', color: '#ef4444' },
];

// Product categories
export const CATEGORIES = [
  { id: 1, name: 'Shirts', slug: 'shirts' },
  { id: 2, name: 'T-Shirts', slug: 't-shirts' },
  { id: 3, name: 'Trousers', slug: 'trousers' },
  { id: 4, name: 'Jackets', slug: 'jackets' },
  { id: 5, name: 'Shorts', slug: 'shorts' },
  { id: 6, name: 'Polo', slug: 'polo' },
];

// Sizes
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Color options
export const COLOR_OPTIONS = [
  { name: 'Black', hex: '#0A0A0A' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Green', hex: '#1B4332' },
  { name: 'Blue', hex: '#4A90D9' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Gray', hex: '#808080' },
];

// Sort options
export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popularity', label: 'Popularity' },
];

// Shipping methods
export const SHIPPING_METHODS = [
  { name: 'Standard Shipping', time: '5-7 business days', price: 0 },
  { name: 'Express Shipping', time: '2-3 business days', price: 149 },
  { name: 'Same Day Delivery', time: 'Today', price: 299 },
];

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI / QR', icon: 'Smartphone' },
  { value: 'cod', label: 'Cash on Delivery', icon: 'Truck' },
];

// Feature highlights
export const FEATURES = [
  { icon: 'Truck', title: 'Free Shipping', desc: 'On orders above ₹999' },
  { icon: 'RotateCcw', title: 'Easy Returns', desc: '15-day return policy' },
  { icon: 'Shield', title: 'Secure Payments', desc: 'SSL encrypted checkout' },
  { icon: 'Star', title: 'Premium Quality', desc: 'Curated fabrics & fits' },
];

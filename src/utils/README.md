# Utility Functions Documentation

This directory contains consolidated utility functions for common operations across the application.

## Files

### validation.js
Reusable validation functions for form inputs and data validation.

**Key Functions:**
- `validateEmail(email)` - Validate email format
- `validatePassword(password)` - Validate password strength
- `validatePhone(phone)` - Validate Indian phone numbers
- `validatePinCode(pinCode)` - Validate Indian PIN codes
- `validateName(name)` - Validate name length
- `validateLength(value, min, max, fieldName)` - Validate string length
- `validatePasswordMatch(password, confirmPassword)` - Validate password confirmation
- `validateForm(data, rules)` - Batch validate multiple fields
- `sanitizeInput(input)` - Sanitize user input to prevent XSS

**Example Usage:**
```javascript
import { validateEmail, validatePasswordMatch, validateForm } from '../utils/validation';

// Single field validation
const emailValidation = validateEmail(email);
if (!emailValidation.isValid) {
  setError(emailValidation.error);
}

// Password confirmation
const matchValidation = validatePasswordMatch(password, confirmPassword);
if (!matchValidation.isValid) {
  setError(matchValidation.error);
}

// Batch validation
const validation = validateForm(formData, {
  name: { required: true, minLength: 2, maxLength: 50 },
  email: { required: true, validate: validateEmail },
  phone: { required: true, validate: validatePhone }
});

if (!validation.isValid) {
  setErrors(validation.errors);
}
```

### apiHelpers.js
Standardized error handling and response formatting for API calls.

**Key Functions:**
- `getAuthErrorMessage(error)` - Convert auth errors to user-friendly messages
- `getDatabaseErrorMessage(error)` - Convert database errors to user-friendly messages
- `handleAPIError(error, context)` - Handle any API error with consistent format
- `withErrorHandling(apiCall, context)` - Wrap API calls with error handling
- `requireAuth()` - Require authentication for API calls
- `formatResponse(response, context)` - Format Supabase responses
- `retryWithBackoff(apiCall, maxRetries, initialDelay)` - Retry failed API calls

**Example Usage:**
```javascript
import { handleAPIError, requireAuth, formatResponse } from '../utils/apiHelpers';

// In API functions
export async function getUserData() {
  try {
    const user = await requireAuth();
    
    const response = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return formatResponse(response, 'fetching user data');
  } catch (error) {
    return handleAPIError(error, 'fetching user data');
  }
}

// Using withErrorHandling wrapper
export async function updateProfile(data) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { data: result } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .single();
    return result;
  }, 'updating profile');
}
```

### format.js
Formatting utilities for displaying data.

**Key Functions:**
- `formatPrice(amount)` - Format price in Indian Rupees
- `formatDate(date)` - Format date for display
- `formatNumber(number)` - Format numbers with commas

### helpers.js
General helper functions for common operations.

**Key Functions:**
- `sleep(ms)` - Async sleep utility
- `debounce(func, delay)` - Debounce function calls
- `throttle(func, limit)` - Throttle function calls
- `copyToClipboard(text)` - Copy text to clipboard

### queryMonitor.js
Query performance monitoring utility for tracking database query execution times.

**Key Features:**
- Automatic slow query detection (>100ms threshold)
- Query statistics tracking (count, average time, slow queries)
- Configurable threshold and enable/disable options
- Minimal performance overhead

**Key Functions:**
- `monitorQuery(queryName, queryFn)` - Wrapper function to monitor async operations (recommended)
- `queryMonitor.startQuery(queryName)` - Start monitoring a query (returns end function)
- `queryMonitor.getQueryStats()` - Get query statistics
- `queryMonitor.setThreshold(ms)` - Set custom slow query threshold
- `queryMonitor.reset()` - Clear all statistics
- `queryMonitor.setEnabled(boolean)` - Enable/disable monitoring

**Example Usage:**
```javascript
import { monitorQuery, queryMonitor } from '../utils/queryMonitor';

// Recommended: Using monitorQuery wrapper
const result = await monitorQuery('fetchProducts', async () => {
  return await supabase
    .from('products')
    .select('*')
    .eq('category', 'shirts');
});

// Manual monitoring
const endMonitoring = queryMonitor.startQuery('fetchOrders');
const orders = await supabase.from('orders').select('*');
endMonitoring();

// Get statistics
const stats = queryMonitor.getQueryStats();
console.log(`Total Queries: ${stats.queryCount}`);
console.log(`Average Time: ${stats.averageQueryTime}ms`);
console.log(`Slow Queries: ${stats.slowQueries.length}`);

// Configure
queryMonitor.setThreshold(200); // Set 200ms threshold
queryMonitor.reset(); // Clear statistics
```

**Slow Query Detection:**
When a query exceeds the threshold, it's automatically logged:
```
🐌 Slow Query Detected (>100ms): {
  query: 'fetchProducts',
  duration: '152.34ms',
  timestamp: '2024-02-15T10:30:45.123Z'
}
```

**See Also:**
- [Query Monitoring Documentation](../../docs/query-monitoring.md)
- [Query Optimization Guide](../../docs/query-optimization.md)

## Components

### ErrorMessage Component
Reusable error display component with optional retry functionality.

**Location:** `src/components/common/ErrorMessage.jsx`

**Props:**
- `message` (string, required) - Error message to display
- `title` (string, optional) - Error title (default: "Error")
- `type` (string, optional) - "error" or "warning" (default: "error")
- `onRetry` (function, optional) - Retry callback function
- `showIcon` (boolean, optional) - Show error icon (default: true)
- `className` (string, optional) - Additional CSS classes

**Example Usage:**
```javascript
import ErrorMessage from '../components/common/ErrorMessage';

// Basic error
<ErrorMessage message="Failed to load data" />

// With retry
<ErrorMessage
  title="Connection Error"
  message="Unable to connect to server"
  onRetry={() => refetch()}
/>

// Warning type
<ErrorMessage
  type="warning"
  message="Your session will expire soon"
/>
```

### LoadingSpinner Component
Reusable loading indicator component.

**Location:** `src/components/common/LoadingSpinner.jsx`

**Example Usage:**
```javascript
import LoadingSpinner from '../components/common/LoadingSpinner';

{isLoading && <LoadingSpinner />}
```

## Best Practices

### Form Validation
1. Use consolidated validation functions instead of inline validation
2. Validate on both client and server side
3. Provide clear, user-friendly error messages
4. Use `validateForm()` for batch validation of multiple fields

### API Error Handling
1. Always use `try-catch` blocks in API functions
2. Use `handleAPIError()` for consistent error responses
3. Use `requireAuth()` instead of manually checking authentication
4. Use `formatResponse()` for consistent success responses
5. Log errors with context for debugging

### Component Usage
1. Use `ErrorMessage` component for displaying errors instead of custom markup
2. Use `LoadingSpinner` for loading states
3. Keep error messages user-friendly and actionable
4. Provide retry functionality when appropriate

## Migration Guide

### Before (Duplicate Code)
```javascript
// In multiple files
const validateEmail = (email) => {
  if (!email) return { isValid: false, error: 'Email required' };
  if (!email.includes('@')) return { isValid: false, error: 'Invalid email' };
  return { isValid: true };
};

// Error handling
try {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return { success: true, data };
} catch (error) {
  console.error('Error:', error);
  return { success: false, error: error.message };
}
```

### After (Consolidated)
```javascript
// Import once, use everywhere
import { validateEmail } from '../utils/validation';
import { handleAPIError, formatResponse } from '../utils/apiHelpers';

// Validation
const validation = validateEmail(email);
if (!validation.isValid) {
  setError(validation.error);
}

// Error handling
try {
  const response = await supabase.from('users').select('*');
  return formatResponse(response, 'fetching users');
} catch (error) {
  return handleAPIError(error, 'fetching users');
}
```

## Testing

All utility functions are pure functions that can be easily tested:

```javascript
import { validateEmail, validatePasswordMatch } from '../utils/validation';

describe('Validation Utils', () => {
  test('validateEmail returns error for invalid email', () => {
    const result = validateEmail('invalid');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });
  
  test('validatePasswordMatch returns error when passwords do not match', () => {
    const result = validatePasswordMatch('pass123', 'pass456');
    expect(result.isValid).toBe(false);
  });
});
```

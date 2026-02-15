# Task 4.8: Web Vitals Tracking Implementation

## Overview

Implemented comprehensive Web Vitals tracking to monitor Core Web Vitals metrics in the e-commerce platform. This enables real-time performance monitoring and helps identify performance issues affecting user experience.

## Implementation Details

### 1. Package Installation

Installed `web-vitals` v5.1.0 package:
```bash
npm install web-vitals
```

### 2. Web Vitals Utility (`src/utils/reportWebVitals.js`)

Created a comprehensive utility that tracks all Core Web Vitals metrics:

**Tracked Metrics:**
- **LCP (Largest Contentful Paint)**: Measures loading performance
  - Good: < 2.5s
  - Needs Improvement: 2.5s - 4s
  - Poor: > 4s

- **INP (Interaction to Next Paint)**: Measures interactivity (replaces FID in web-vitals v3+)
  - Good: < 200ms
  - Needs Improvement: 200ms - 500ms
  - Poor: > 500ms

- **CLS (Cumulative Layout Shift)**: Measures visual stability
  - Good: < 0.1
  - Needs Improvement: 0.1 - 0.25
  - Poor: > 0.25

- **FCP (First Contentful Paint)**: Measures perceived load speed
  - Good: < 1.8s
  - Needs Improvement: 1.8s - 3s
  - Poor: > 3s

- **TTFB (Time to First Byte)**: Measures server response time
  - Good: < 800ms
  - Needs Improvement: 800ms - 1800ms
  - Poor: > 1800ms

**Features:**
- Logs metrics to console in development mode
- Supports Google Analytics integration in production
- Includes metric thresholds helper function
- Provides structured metric data with ratings

### 3. Integration (`src/main.jsx`)

Integrated Web Vitals tracking into the application entry point:
```javascript
import { reportWebVitals } from './utils/reportWebVitals.js';

// ... app initialization

// Initialize Web Vitals tracking
reportWebVitals();
```

### 4. Testing Setup

**Test Framework Configuration:**
- Installed Vitest and testing utilities
- Created `vitest.config.js` with jsdom environment
- Created test setup file at `src/test/setup.js`
- Added test scripts to `package.json`

**Test Coverage:**
- 14 unit tests covering all functionality
- Tests for metric threshold validation
- Tests for threshold ordering
- Tests for utility function behavior

**Test Results:**
```
✓ src/utils/reportWebVitals.test.js (14 tests)
  ✓ reportWebVitals (14)
    ✓ should be a function
    ✓ should call web-vitals functions when invoked
    ✓ getMetricThresholds (6)
    ✓ metric rating validation (5)
    ✓ threshold ordering (1)

Test Files  1 passed (1)
Tests  14 passed (14)
```

## Analytics Integration

The utility is ready for production analytics integration. To enable:

### Google Analytics
Uncomment the Google Analytics code in `sendToAnalytics()`:
```javascript
if (window.gtag) {
  window.gtag('event', name, {
    event_category: 'Web Vitals',
    event_label: id,
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    metric_rating: rating,
    non_interaction: true,
  });
}
```

### Custom Analytics Endpoint
Uncomment and configure the custom endpoint:
```javascript
fetch('/api/analytics/web-vitals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name,
    value,
    rating,
    id,
    timestamp: Date.now(),
    url: window.location.href,
  }),
}).catch(console.error);
```

## Usage

The Web Vitals tracking is automatically initialized when the application starts. No additional configuration is required.

**Development Mode:**
- Metrics are logged to the browser console
- Each metric includes value, rating, ID, and delta

**Production Mode:**
- Metrics can be sent to analytics services
- Configure analytics integration as needed

## Benefits

1. **Performance Monitoring**: Track real user performance metrics
2. **Issue Detection**: Identify performance regressions early
3. **User Experience**: Understand how users experience the site
4. **Optimization Guidance**: Data-driven performance improvements
5. **Compliance**: Meet Core Web Vitals requirements for SEO

## Files Modified

- `src/utils/reportWebVitals.js` - Created Web Vitals utility
- `src/utils/reportWebVitals.test.js` - Created unit tests
- `src/main.jsx` - Integrated Web Vitals tracking
- `package.json` - Added web-vitals dependency and test scripts
- `vitest.config.js` - Created test configuration
- `src/test/setup.js` - Created test setup file

## Requirements Validated

✅ **Requirement 3.8**: Track and report Web Vitals metrics (LCP, INP, CLS, FCP, TTFB)

## Next Steps

1. Monitor Web Vitals metrics in development
2. Configure production analytics integration
3. Set up alerts for poor metric ratings
4. Use metrics to guide further optimizations
5. Run Lighthouse audits to verify improvements (Task 4.9)

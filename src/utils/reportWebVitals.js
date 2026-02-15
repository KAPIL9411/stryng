/**
 * Web Vitals Tracking Utility
 * 
 * Tracks and reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - INP (Interaction to Next Paint): Measures interactivity (replaces FID)
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - FCP (First Contentful Paint): Measures perceived load speed
 * - TTFB (Time to First Byte): Measures server response time
 * 
 * Metrics are logged to console in development and can be sent to analytics in production.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

/**
 * Report a Web Vitals metric
 * @param {Object} metric - The metric object from web-vitals
 * @param {string} metric.name - Metric name (LCP, INP, CLS, FCP, TTFB)
 * @param {number} metric.value - Metric value
 * @param {string} metric.rating - Rating (good, needs-improvement, poor)
 * @param {number} metric.id - Unique metric ID
 * @param {number} metric.delta - Delta from previous value
 */
function sendToAnalytics(metric) {
  const { name, value, rating, id, delta } = metric;

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      rating,
      id,
      delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
    });
  }

  // In production, send to analytics service
  // This can be customized to send to Google Analytics, Sentry, or custom analytics
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', name, {
        event_category: 'Web Vitals',
        event_label: id,
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        metric_rating: rating,
        non_interaction: true,
      });
    }

    // Example: Send to custom analytics endpoint
    // fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     name,
    //     value,
    //     rating,
    //     id,
    //     timestamp: Date.now(),
    //     url: window.location.href,
    //   }),
    // }).catch(console.error);
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this function once when the app starts
 */
export function reportWebVitals() {
  // Track Largest Contentful Paint (LCP)
  // Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
  onLCP(sendToAnalytics);

  // Track Interaction to Next Paint (INP) - replaces FID in web-vitals v3+
  // Good: < 200ms, Needs Improvement: 200ms - 500ms, Poor: > 500ms
  onINP(sendToAnalytics);

  // Track Cumulative Layout Shift (CLS)
  // Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
  onCLS(sendToAnalytics);

  // Track First Contentful Paint (FCP)
  // Good: < 1.8s, Needs Improvement: 1.8s - 3s, Poor: > 3s
  onFCP(sendToAnalytics);

  // Track Time to First Byte (TTFB)
  // Good: < 800ms, Needs Improvement: 800ms - 1800ms, Poor: > 1800ms
  onTTFB(sendToAnalytics);
}

/**
 * Get metric thresholds for rating
 * @param {string} metricName - Name of the metric
 * @returns {Object} Thresholds for good and poor ratings
 */
export function getMetricThresholds(metricName) {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
  };

  return thresholds[metricName] || { good: 0, poor: 0 };
}

export default reportWebVitals;

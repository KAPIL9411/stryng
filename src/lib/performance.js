/**
 * Performance Monitoring Utilities
 * Helps track and optimize application performance
 */

/**
 * Measure component render time
 * Usage: const measure = measureRender('ComponentName');
 *        // ... component logic
 *        measure();
 */
export const measureRender = (componentName) => {
    const start = performance.now();
    return () => {
        const end = performance.now();
        const duration = end - start;
        if (duration > 16) { // Longer than one frame (60fps)
            console.warn(`⚠️ ${componentName} render took ${duration.toFixed(2)}ms`);
        }
    };
};

/**
 * Measure API call duration
 * Usage: const measure = measureAPI('fetchProducts');
 *        await fetch(...);
 *        measure();
 */
export const measureAPI = (apiName) => {
    const start = performance.now();
    return () => {
        const end = performance.now();
        const duration = end - start;
        console.log(`📊 ${apiName} took ${duration.toFixed(2)}ms`);
        return duration;
    };
};

/**
 * Log performance metrics to console
 * Call this after page load to see metrics
 */
export const logPerformanceMetrics = () => {
    if (typeof window === 'undefined' || !window.performance) return;

    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.group('📊 Performance Metrics');
    console.log(`Page Load Time: ${pageLoadTime}ms`);
    console.log(`Server Response Time: ${connectTime}ms`);
    console.log(`DOM Render Time: ${renderTime}ms`);
    console.groupEnd();

    // Web Vitals (if available)
    if ('PerformanceObserver' in window) {
        try {
            // Largest Contentful Paint
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log(`🎨 LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    console.log(`⚡ FID: ${entry.processingStart - entry.startTime}ms`);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
            // PerformanceObserver not fully supported
        }
    }
};

/**
 * Debounce function for performance optimization
 * Useful for search inputs, scroll handlers, etc.
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function for performance optimization
 * Useful for scroll handlers, resize handlers, etc.
 */
export const throttle = (func, limit = 100) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

/**
 * Check if image is in viewport (for lazy loading)
 */
export const isInViewport = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
};

/**
 * Preload critical images
 * Call this for hero images, above-the-fold content
 */
export const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

/**
 * Preload multiple images
 */
export const preloadImages = (srcArray) => {
    return Promise.all(srcArray.map(preloadImage));
};

/**
 * Get connection speed (if available)
 */
export const getConnectionSpeed = () => {
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return {
            effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
            downlink: connection.downlink, // Mbps
            rtt: connection.rtt, // Round trip time in ms
            saveData: connection.saveData // User has data saver enabled
        };
    }
    return null;
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Memory usage (Chrome only)
 */
export const getMemoryUsage = () => {
    if (performance.memory) {
        return {
            usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
            totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
            jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
        };
    }
    return null;
};

// Auto-log performance metrics in development
if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(logPerformanceMetrics, 0);
        });
    }
}

/**
 * Initialize comprehensive performance monitoring
 * Call this once on app startup
 */
export const initPerformanceMonitoring = () => {
    if (typeof window === 'undefined') return;

    console.log('🚀 Performance monitoring initialized');

    // Measure Core Web Vitals
    if ('PerformanceObserver' in window) {
        try {
            // Largest Contentful Paint (LCP)
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                const lcp = lastEntry.renderTime || lastEntry.loadTime;
                const rating = lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor';
                
                console.log(`[Web Vital] LCP: ${lcp.toFixed(2)}ms (${rating})`);
                
                if (window.gtag) {
                    window.gtag('event', 'LCP', {
                        value: Math.round(lcp),
                        metric_rating: rating,
                        event_category: 'Web Vitals',
                    });
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    const fid = entry.processingStart - entry.startTime;
                    const rating = fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor';
                    
                    console.log(`[Web Vital] FID: ${fid.toFixed(2)}ms (${rating})`);
                    
                    if (window.gtag) {
                        window.gtag('event', 'FID', {
                            value: Math.round(fid),
                            metric_rating: rating,
                            event_category: 'Web Vitals',
                        });
                    }
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });

            // Cumulative Layout Shift (CLS)
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                
                const rating = clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor';
                console.log(`[Web Vital] CLS: ${clsValue.toFixed(3)} (${rating})`);
                
                if (window.gtag) {
                    window.gtag('event', 'CLS', {
                        value: Math.round(clsValue * 1000) / 1000,
                        metric_rating: rating,
                        event_category: 'Web Vitals',
                    });
                }
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });

            // First Contentful Paint (FCP)
            const fcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.name === 'first-contentful-paint') {
                        const fcp = entry.startTime;
                        const rating = fcp < 1800 ? 'good' : fcp < 3000 ? 'needs-improvement' : 'poor';
                        
                        console.log(`[Web Vital] FCP: ${fcp.toFixed(2)}ms (${rating})`);
                        
                        if (window.gtag) {
                            window.gtag('event', 'FCP', {
                                value: Math.round(fcp),
                                metric_rating: rating,
                                event_category: 'Web Vitals',
                            });
                        }
                    }
                });
            });
            fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
            console.warn('Some performance observers not supported:', e.message);
        }
    }

    // Log page load metrics
    window.addEventListener('load', () => {
        setTimeout(() => {
            logPerformanceMetrics();
        }, 0);
    });
};

/**
 * Measure API call duration
 * @param {string} name - Name of the API call
 * @param {Function} apiCall - Async function to measure
 * @returns {Promise} Result of the API call
 */
export const measureAPICall = async (name, apiCall) => {
    const startTime = performance.now();
    
    try {
        const result = await apiCall();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`[API Performance] ${name}: ${duration.toFixed(2)}ms`);
        
        if (window.gtag) {
            window.gtag('event', 'timing_complete', {
                name: name,
                value: Math.round(duration),
                event_category: 'API',
            });
        }
        
        return result;
    } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.error(`[API Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
    }
};

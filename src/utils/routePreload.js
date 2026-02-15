/**
 * Route preloading utilities
 * Preload lazy-loaded routes on hover for instant navigation
 */

// Store preloaded routes to avoid duplicate preloads
const preloadedRoutes = new Set();

/**
 * Preload a lazy-loaded route component
 * @param {Function} importFn - The dynamic import function
 * @param {string} routeName - Name of the route for tracking
 */
export const preloadRoute = (importFn, routeName) => {
  if (preloadedRoutes.has(routeName)) {
    return; // Already preloaded
  }

  preloadedRoutes.add(routeName);
  
  // Trigger the dynamic import
  importFn().catch((error) => {
    console.error(`Failed to preload route: ${routeName}`, error);
    // Remove from set so it can be retried
    preloadedRoutes.delete(routeName);
  });
};

/**
 * Create a preload handler for link hover events
 * @param {Function} importFn - The dynamic import function
 * @param {string} routeName - Name of the route
 * @returns {Function} Event handler for onMouseEnter
 */
export const createPreloadHandler = (importFn, routeName) => {
  return () => preloadRoute(importFn, routeName);
};

// Preload functions for common routes
export const preloadCheckout = () => preloadRoute(
  () => import('../pages/CheckoutOptimized'),
  'checkout'
);

export const preloadAddresses = () => preloadRoute(
  () => import('../pages/Addresses'),
  'addresses'
);

export const preloadCart = () => preloadRoute(
  () => import('../pages/Cart'),
  'cart'
);

export const preloadProducts = () => preloadRoute(
  () => import('../pages/ProductListing'),
  'products'
);

export const preloadAccount = () => preloadRoute(
  () => import('../pages/Account'),
  'account'
);

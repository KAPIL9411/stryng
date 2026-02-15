/**
 * Analytics Tracking Utilities
 * Supports Google Analytics, Facebook Pixel, and custom events
 */

// Initialize Google Analytics
export const initGA = (measurementId) => {
  if (typeof window === 'undefined' || !measurementId) return;

  // Load GA script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, {
    page_path: window.location.pathname,
  });
};

// Track page view
export const trackPageView = (url) => {
  if (typeof window.gtag === 'function') {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// Track custom event
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.log('📊 Analytics Event:', eventName, eventParams);
  }
};

// E-commerce tracking events
export const trackProductView = (product) => {
  trackEvent('view_item', {
    currency: 'INR',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_brand: product.brand,
        item_category: product.category,
        price: product.price,
      },
    ],
  });
};

export const trackAddToCart = (product, quantity = 1) => {
  trackEvent('add_to_cart', {
    currency: 'INR',
    value: product.price * quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_brand: product.brand,
        item_category: product.category,
        price: product.price,
        quantity: quantity,
      },
    ],
  });
};

export const trackRemoveFromCart = (product, quantity = 1) => {
  trackEvent('remove_from_cart', {
    currency: 'INR',
    value: product.price * quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: quantity,
      },
    ],
  });
};

export const trackBeginCheckout = (cart, total) => {
  trackEvent('begin_checkout', {
    currency: 'INR',
    value: total,
    items: cart.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_brand: item.brand,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

export const trackPurchase = (orderId, cart, total) => {
  trackEvent('purchase', {
    transaction_id: orderId,
    currency: 'INR',
    value: total,
    items: cart.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_brand: item.brand,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

export const trackSearch = (searchTerm, resultsCount) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

export const trackAddToWishlist = (product) => {
  trackEvent('add_to_wishlist', {
    currency: 'INR',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_brand: product.brand,
        price: product.price,
      },
    ],
  });
};

export const trackSignUp = (method = 'email') => {
  trackEvent('sign_up', {
    method: method,
  });
};

export const trackLogin = (method = 'email') => {
  trackEvent('login', {
    method: method,
  });
};

// User engagement tracking
export const trackTimeOnPage = (pageName, timeInSeconds) => {
  trackEvent('time_on_page', {
    page_name: pageName,
    time_seconds: timeInSeconds,
  });
};

export const trackScroll = (percentage) => {
  trackEvent('scroll', {
    percent_scrolled: percentage,
  });
};

// Error tracking
export const trackError = (errorMessage, errorLocation) => {
  trackEvent('error', {
    error_message: errorMessage,
    error_location: errorLocation,
  });
};

// Initialize analytics on app load
export const initAnalytics = () => {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (gaId) {
    initGA(gaId);
    console.log('✅ Analytics initialized');
  } else if (import.meta.env.DEV) {
    console.log(
      'ℹ️ Analytics not configured (add VITE_GA_MEASUREMENT_ID to .env.local)'
    );
  }
};

// Track scroll depth
let maxScroll = 0;
export const setupScrollTracking = () => {
  if (typeof window === 'undefined') return;

  const handleScroll = () => {
    const scrollPercentage = Math.round(
      (window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight)) *
        100
    );

    // Track milestones: 25%, 50%, 75%, 100%
    if (scrollPercentage > maxScroll) {
      maxScroll = scrollPercentage;

      if (scrollPercentage >= 25 && scrollPercentage < 50 && maxScroll < 50) {
        trackScroll(25);
      } else if (
        scrollPercentage >= 50 &&
        scrollPercentage < 75 &&
        maxScroll < 75
      ) {
        trackScroll(50);
      } else if (
        scrollPercentage >= 75 &&
        scrollPercentage < 100 &&
        maxScroll < 100
      ) {
        trackScroll(75);
      } else if (scrollPercentage >= 100) {
        trackScroll(100);
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => window.removeEventListener('scroll', handleScroll);
};

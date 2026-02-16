/**
 * Preload Banners on App Start
 * Fetches and caches banners immediately when app loads
 * This ensures instant display on home page
 */

import { fetchBanners } from '../api/banners.api';

/**
 * Preload banners in background
 * Called on app initialization
 */
export const preloadBanners = async () => {
  try {
    console.log('🚀 Preloading banners...');
    
    // Fetch banners (will use cache if available, or fetch from DB)
    await fetchBanners();
    
    console.log('✅ Banners preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Banner preload failed (non-critical):', error);
    // Don't throw - preload failure shouldn't break the app
  }
};

/**
 * Initialize banner preloading
 * Call this in main.jsx or App.jsx
 */
export const initBannerPreload = () => {
  // Preload immediately
  preloadBanners();
  
  // Also preload when user comes back online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('🌐 Back online - refreshing banners');
      preloadBanners();
    });
  }
};

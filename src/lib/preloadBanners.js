/**
 * Preload Banners on App Start
 * Fetches and caches banners immediately when app loads
 * This ensures instant display on home page
 */

import { fetchBanners } from '../api/banners-edge.api';
import { queryClient } from './queryClient';
import { queryKeys } from './queryClient';

/**
 * Preload banners directly into React Query cache
 * Called on app initialization for instant loading
 */
export const preloadBanners = async () => {
  try {
    console.log('🚀 Preloading banners into cache...');
    
    // Fetch banners using edge API (will use memory/IndexedDB cache if available)
    const banners = await fetchBanners();
    
    // Immediately populate React Query cache
    queryClient.setQueryData(queryKeys.banners.active(), banners);
    
    console.log(`✅ Banners preloaded successfully (${banners.length} banners)`);
  } catch (error) {
    console.warn('⚠️ Banner preload failed (non-critical):', error.message || error);
    // Don't throw - preload failure shouldn't break the app
  }
};

/**
 * Initialize banner preloading
 * Call this in main.jsx
 */
export const initBannerPreload = () => {
  try {
    // Preload immediately (but don't await - let it run in background)
    preloadBanners().catch(err => {
      console.warn('Background banner preload error:', err);
    });
    
    // Also preload when user comes back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Back online - refreshing banners');
        preloadBanners().catch(err => {
          console.warn('Online banner refresh error:', err);
        });
      });
    }
  } catch (error) {
    console.warn('⚠️ Banner preload initialization failed:', error);
  }
};


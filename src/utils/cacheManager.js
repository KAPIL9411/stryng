/**
 * Cache Manager Utility
 * Provides admin tools for cache management
 */

import { clearBannersCache } from '../lib/bannersCache';

/**
 * Clear all application caches
 * Useful for troubleshooting or forcing fresh data
 */
export const clearAllCaches = async () => {
  try {
    console.log('🗑️ Clearing all caches...');
    
    // Clear banner cache
    await clearBannersCache();
    
    // Clear React Query cache (if needed)
    if (window.queryClient) {
      window.queryClient.clear();
      console.log('✅ React Query cache cleared');
    }
    
    // Clear service worker cache (if exists)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ Service Worker caches cleared');
    }
    
    console.log('✅ All caches cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

/**
 * Get cache statistics
 * Shows cache sizes and status
 */
export const getCacheStats = async () => {
  const stats = {
    localStorage: 0,
    indexedDB: 0,
    serviceWorker: 0,
  };

  try {
    // LocalStorage size
    let localStorageSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localStorageSize += localStorage[key].length + key.length;
      }
    }
    stats.localStorage = (localStorageSize / 1024).toFixed(2) + ' KB';

    // IndexedDB size (approximate)
    if ('indexedDB' in window) {
      const db = await new Promise((resolve) => {
        const request = indexedDB.open('StryngCache', 1);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = () => resolve(null);
      });

      if (db) {
        stats.indexedDB = 'Available';
      }
    }

    // Service Worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      stats.serviceWorker = `${cacheNames.length} cache(s)`;
    }

    return stats;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return stats;
  }
};

/**
 * Expose cache manager to window for admin console access
 */
if (typeof window !== 'undefined') {
  window.cacheManager = {
    clear: clearAllCaches,
    stats: getCacheStats,
    help: () => {
      console.log(`
🔧 Cache Manager Commands:

  window.cacheManager.clear()
    - Clear all application caches
    - Forces fresh data fetch
    - Use when data seems stale

  window.cacheManager.stats()
    - Show cache statistics
    - See cache sizes and status

  window.cacheManager.help()
    - Show this help message

Example:
  await window.cacheManager.clear()
  await window.cacheManager.stats()
      `);
    },
  };

  console.log('💡 Cache Manager available: window.cacheManager.help()');
}

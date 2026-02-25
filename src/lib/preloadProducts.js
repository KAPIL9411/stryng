/**
 * Preload Products on App Start
 * Fetches and caches products immediately for instant loading
 */

import { fetchProducts } from '../api/products-edge.api';
import { queryClient } from './queryClient';

/**
 * Preload first page of products into React Query cache
 */
export const preloadProducts = async () => {
  try {
    console.log('🚀 Preloading products into cache...');
    
    // Fetch first page of products (will use memory/IndexedDB cache if available)
    const result = await fetchProducts(1, 24, {});
    
    // Immediately populate React Query cache
    queryClient.setQueryData(['products', 1, {}], result);
    
    console.log(`✅ Products preloaded successfully (${result.products.length} products)`);
  } catch (error) {
    console.warn('⚠️ Product preload failed (non-critical):', error.message || error);
  }
};

/**
 * Initialize product preloading
 */
export const initProductPreload = () => {
  try {
    // Preload immediately in background
    preloadProducts().catch(err => {
      console.warn('Background product preload error:', err);
    });
    
    // Also preload when user comes back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Back online - refreshing products');
        preloadProducts().catch(err => {
          console.warn('Online product refresh error:', err);
        });
      });
    }
  } catch (error) {
    console.warn('⚠️ Product preload initialization failed:', error);
  }
};

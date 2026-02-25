/**
 * Banners API with Vercel Edge Config
 * Ultra-fast banner loading using edge functions
 * @module api/banners-edge
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

// Edge function URL (will be /api/banners-edge after deployment)
const EDGE_API_URL = '/api/banners-edge';

// Fallback cache in memory (for instant loading)
let memoryCache = null;
let cacheTimestamp = null;
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch banners from Edge Config (ultra-fast)
 * Falls back to Supabase if edge function fails
 * @returns {Promise<Array>} Active banners
 */
export const fetchBanners = async () => {
  try {
    // Return memory cache if fresh (instant)
    if (memoryCache && cacheTimestamp && Date.now() - cacheTimestamp < MEMORY_CACHE_TTL) {
      console.log('⚡ Banners from memory cache (instant)');
      // Refresh in background
      refreshBannersInBackground();
      return memoryCache;
    }

    console.log('📡 Fetching banners from edge function...');
    
    // Try edge function first (deployed on Vercel)
    try {
      const response = await fetch(EDGE_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        // Check if response is JSON
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          
          if (result.success && result.data) {
            console.log(`✅ Banners loaded from ${result.source} (${result.cached ? 'cached' : 'fresh'})`);
            
            // Update memory cache
            memoryCache = result.data;
            cacheTimestamp = Date.now();
            
            return result.data;
          }
        } else {
          console.warn('⚠️ Edge function returned non-JSON response (not deployed yet)');
        }
      }
    } catch (edgeError) {
      console.warn('⚠️ Edge function not available:', edgeError.message);
    }

    // Fallback: Direct Supabase query
    console.log('📡 Fetching banners from Supabase (fallback)...');
    const { data, error } = await supabase
      .from(API_ENDPOINTS.BANNERS)
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      
      // Return stale cache if available
      if (memoryCache) {
        console.log('⚠️ Returning stale cache due to error');
        return memoryCache;
      }
      
      throw error;
    }

    const banners = data || [];

    // Update memory cache
    memoryCache = banners;
    cacheTimestamp = Date.now();

    console.log(`✅ Loaded ${banners.length} banners from Supabase`);
    return banners;

  } catch (error) {
    console.error('❌ Banner fetch error:', error);
    
    // Return stale cache if available
    if (memoryCache) {
      console.log('⚠️ Returning stale cache due to error');
      return memoryCache;
    }
    
    // Return empty array instead of throwing
    return [];
  }
};

/**
 * Refresh banners in background (stale-while-revalidate)
 */
const refreshBannersInBackground = async () => {
  try {
    const response = await fetch(EDGE_API_URL);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (result.success && result.data) {
          memoryCache = result.data;
          cacheTimestamp = Date.now();
          console.log('🔄 Background: Banners cache updated');
        }
      }
    }
  } catch (error) {
    // Silent fail for background refresh
    console.warn('Background banner refresh failed (non-critical):', error.message);
  }
};

/**
 * Clear banner cache (call after admin updates)
 */
export const clearBannersCache = () => {
  memoryCache = null;
  cacheTimestamp = null;
  console.log('🗑️ Banner cache cleared');
};

/**
 * Preload banner images for instant display
 * @param {Array} banners - Banner array
 */
export const preloadBannerImages = (banners) => {
  if (!banners || banners.length === 0) return;

  banners.forEach((banner) => {
    const img = new Image();
    img.src = banner.image_url || banner.image;
  });

  console.log(`🖼️ Preloading ${banners.length} banner images`);
};

/**
 * Create new banner (admin)
 * @param {Object} bannerData - Banner data
 * @returns {Promise<Object>} Created banner
 */
export const createBanner = async (bannerData) => {
  const { data, error } = await supabase
    .from(API_ENDPOINTS.BANNERS)
    .insert([bannerData])
    .select();

  if (error) {
    console.error('❌ Banner create error:', error);
    throw error;
  }

  clearBannersCache();
  return data[0];
};

/**
 * Update banner (admin)
 * @param {string} id - Banner ID
 * @param {Object} bannerData - Updated banner data
 * @returns {Promise<Object>} Updated banner
 */
export const updateBanner = async (id, bannerData) => {
  const { data, error } = await supabase
    .from(API_ENDPOINTS.BANNERS)
    .update(bannerData)
    .eq('id', id)
    .select();

  if (error) {
    console.error('❌ Banner update error:', error);
    throw error;
  }

  clearBannersCache();
  return data[0];
};

/**
 * Delete banner (admin)
 * @param {string} id - Banner ID
 * @returns {Promise<void>}
 */
export const deleteBanner = async (id) => {
  const { error } = await supabase
    .from(API_ENDPOINTS.BANNERS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Banner delete error:', error);
    throw error;
  }

  clearBannersCache();
};

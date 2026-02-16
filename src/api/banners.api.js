/**
 * Banners API
 * All banner-related API calls with multi-layer caching
 * @module api/banners
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';
import { 
  getCachedBanners, 
  setCachedBanners, 
  preloadBannerImages 
} from '../lib/bannersCache';

/**
 * Fetch all active banners with caching
 * Uses multi-layer cache for instant loading
 * @returns {Promise<Array>} Active banners
 */
export const fetchBanners = async () => {
  try {
    // Try to get from cache first (instant)
    const cachedData = await getCachedBanners();
    
    if (cachedData) {
      // Return cached data immediately
      // Fetch fresh data in background (stale-while-revalidate)
      fetchFreshBanners();
      return cachedData;
    }

    // No cache, fetch from database
    console.log('📡 Fetching banners from database...');
    const { data, error } = await supabase
      .from(API_ENDPOINTS.BANNERS)
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Banners fetch error:', error);
      throw error;
    }

    const banners = data || [];

    // Cache the data for next time
    await setCachedBanners(banners);
    
    // Preload images for instant display
    preloadBannerImages(banners);

    return banners;
  } catch (error) {
    console.error('❌ Banners fetch error:', error);
    
    // Try to return stale cache on error
    const staleCache = await getCachedBanners();
    if (staleCache) {
      console.log('⚠️ Returning stale cache due to error');
      return staleCache;
    }
    
    throw error;
  }
};

/**
 * Fetch fresh banners in background (for stale-while-revalidate)
 */
const fetchFreshBanners = async () => {
  try {
    const { data, error } = await supabase
      .from(API_ENDPOINTS.BANNERS)
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      // Update cache with fresh data
      await setCachedBanners(data);
      preloadBannerImages(data);
      console.log('🔄 Background: Banners cache updated');
    }
  } catch (error) {
    // Silent fail for background refresh
    console.warn('Background banner refresh failed:', error);
  }
};

/**
 * Create new banner (admin)
 * Clears cache after creation
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

  // Clear cache so fresh data is fetched
  const { clearBannersCache } = await import('../lib/bannersCache');
  await clearBannersCache();
  console.log('🗑️ Banner cache cleared after creation');

  return data[0];
};

/**
 * Update banner (admin)
 * Clears cache after update
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

  // Clear cache so fresh data is fetched
  const { clearBannersCache } = await import('../lib/bannersCache');
  await clearBannersCache();
  console.log('🗑️ Banner cache cleared after update');

  return data[0];
};

/**
 * Delete banner (admin)
 * Clears cache after deletion
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

  // Clear cache so fresh data is fetched
  const { clearBannersCache } = await import('../lib/bannersCache');
  await clearBannersCache();
  console.log('🗑️ Banner cache cleared after deletion');
};

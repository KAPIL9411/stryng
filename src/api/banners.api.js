/**
 * Banners API
 * All banner-related API calls with Edge Config for ultra-fast loading
 * @module api/banners
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

// Import edge-optimized fetch function
export { 
  fetchBanners, 
  clearBannersCache, 
  preloadBannerImages 
} from './banners-edge.api';

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

  // Clear cache and sync to Edge Config
  const { clearBannersCache } = await import('./banners-edge.api');
  clearBannersCache();
  console.log('🗑️ Banner cache cleared after creation');
  console.log('ℹ️  Run "npm run sync:banners" to update Edge Config');

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

  // Clear cache and sync to Edge Config
  const { clearBannersCache } = await import('./banners-edge.api');
  clearBannersCache();
  console.log('🗑️ Banner cache cleared after update');
  console.log('ℹ️  Run "npm run sync:banners" to update Edge Config');

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

  // Clear cache and sync to Edge Config
  const { clearBannersCache } = await import('./banners-edge.api');
  clearBannersCache();
  console.log('🗑️ Banner cache cleared after deletion');
  console.log('ℹ️  Run "npm run sync:banners" to update Edge Config');
};

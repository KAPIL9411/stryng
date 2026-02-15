/**
 * Banners API
 * All banner-related API calls
 * @module api/banners
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

/**
 * Fetch all active banners
 * @returns {Promise<Array>} Active banners
 */
export const fetchBanners = async () => {
  const { data, error } = await supabase
    .from(API_ENDPOINTS.BANNERS)
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ Banners fetch error:', error);
    throw error;
  }

  return data || [];
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
};

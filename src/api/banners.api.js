/**
 * Banners API - Admin Write Operations
 * Public reads  → banners-edge.api.js (cached, fast)
 * Admin writes  → this file (direct Supabase, always invalidates cache)
 * @module api/banners
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

// Re-export all public read functions
export {
  fetchBanners,
  clearBannersCache,
  preloadBannerImages,
} from './banners-edge.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const WRITE_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
    ),
  ]);
}

async function bustCache() {
  const { clearBannersCache } = await import('./banners-edge.api');
  clearBannersCache();
}

function translateError(err, operation) {
  const msg = err?.message || '';
  if (msg.includes('timeout')) {
    return new Error(`Unable to ${operation} banner — request timed out. Please try again.`);
  }
  if (err?.code === '23505') {
    return new Error('A banner with these details already exists.');
  }
  if (msg.includes('JWT') || msg.includes('auth')) {
    return new Error('Session expired. Please refresh and try again.');
  }
  return err;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new banner
 * @param {Object} bannerData
 * @returns {Promise<Object>}
 */
export const createBanner = async (bannerData) => {
  try {
    const { data, error } = await withTimeout(
      supabase.from(API_ENDPOINTS.BANNERS).insert([bannerData]).select().single(),
      WRITE_TIMEOUT_MS,
      'createBanner'
    );

    if (error) throw error;
    if (!data) throw new Error('No data returned after insert');

    await bustCache();
    console.log('✅ Banner created:', data.id);
    return data;
  } catch (err) {
    console.error('❌ createBanner:', err.message);
    throw translateError(err, 'create');
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing banner
 * @param {string} id
 * @param {Object} bannerData
 * @returns {Promise<Object>}
 */
export const updateBanner = async (id, bannerData) => {
  if (!id) throw new Error('Banner ID is required');

  try {
    const { data, error } = await withTimeout(
      supabase.from(API_ENDPOINTS.BANNERS).update(bannerData).eq('id', id).select().single(),
      WRITE_TIMEOUT_MS,
      'updateBanner'
    );

    if (error) throw error;
    if (!data) throw new Error('Banner not found or no rows updated');

    await bustCache();
    console.log('✅ Banner updated:', id);
    return data;
  } catch (err) {
    console.error('❌ updateBanner:', err.message);
    throw translateError(err, 'update');
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a banner
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteBanner = async (id) => {
  if (!id) throw new Error('Banner ID is required');

  try {
    const { error } = await withTimeout(
      supabase.from(API_ENDPOINTS.BANNERS).delete().eq('id', id),
      WRITE_TIMEOUT_MS,
      'deleteBanner'
    );

    if (error) throw error;

    await bustCache();
    console.log('✅ Banner deleted:', id);
  } catch (err) {
    console.error('❌ deleteBanner:', err.message);
    throw translateError(err, 'delete');
  }
};
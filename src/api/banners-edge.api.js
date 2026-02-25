/**
 * Banners Edge API - Optimized with SWR + request deduplication
 * Same patterns as products-edge.api.js for consistency
 * @module api/banners-edge
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

// ─── Constants ───────────────────────────────────────────────────────────────
const EDGE_API_URL = '/api/banners-edge';
const MEMORY_TTL = 5 * 60 * 1000;   // 5 min
const STALE_TTL = 30 * 60 * 1000;   // 30 min stale fallback
const EDGE_TIMEOUT = 3000;           // 3s — banners are small, fail fast
const SUPABASE_TIMEOUT = 6000;

// ─── Memory Cache ─────────────────────────────────────────────────────────────
// Object-based instead of module-level mutable variables to avoid stale closure bugs
const cache = { data: null, ts: 0 };

function cacheGet() {
  if (!cache.data) return null;
  if (Date.now() - cache.ts > MEMORY_TTL) return null;
  return cache.data;
}

function cacheSet(data) {
  cache.data = data;
  cache.ts = Date.now();
}

function cacheGetStale() {
  if (!cache.data) return null;
  if (Date.now() - cache.ts > STALE_TTL) return null;
  return cache.data;
}

// ─── Request Deduplication ────────────────────────────────────────────────────
let inflightRequest = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
    ),
  ]);
}

function normalizeBanner(b) {
  return {
    id: b.id,
    title: b.title || '',
    subtitle: b.subtitle || '',
    image_url: b.image_url || b.image || '',
    image: b.image_url || b.image || '',
    link: b.link || b.cta_link || '',
    cta_text: b.cta_text || '',
    cta_link: b.cta_link || b.link || '',
    active: b.active !== false,
    sort_order: b.sort_order ?? 0,
    mobile_image_url: b.mobile_image_url || b.image_url || b.image || '',
  };
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────
async function fetchFromNetwork() {
  // Try edge function first
  try {
    const res = await withTimeout(fetch(EDGE_API_URL), EDGE_TIMEOUT, 'banners edge');
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data.map(normalizeBanner);
        }
      }
    }
    throw new Error('Edge: bad response');
  } catch (edgeErr) {
    console.warn('⚠️ Banners edge fallback:', edgeErr.message);
  }

  // Fallback: Supabase direct
  const { data, error } = await withTimeout(
    supabase
      .from(API_ENDPOINTS.BANNERS)
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    SUPABASE_TIMEOUT,
    'banners supabase'
  );

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeBanner);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch active banners with SWR caching
 * @returns {Promise<Array>}
 */
export const fetchBanners = async () => {
  // 1. Fresh memory cache → return immediately + background refresh
  const fresh = cacheGet();
  if (fresh) {
    revalidateInBackground();
    return fresh;
  }

  // 2. In-flight deduplication → wait for existing request
  if (inflightRequest) {
    return inflightRequest;
  }

  // 3. Fetch from network
  inflightRequest = fetchFromNetwork()
    .then((banners) => {
      cacheSet(banners);
      return banners;
    })
    .catch((err) => {
      console.error('❌ fetchBanners failed:', err.message);
      // Stale fallback — better something than nothing
      const stale = cacheGetStale();
      if (stale) {
        console.warn('⚠️ Returning stale banners');
        return stale;
      }
      return [];
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
};

async function revalidateInBackground() {
  if (inflightRequest) return; // already revalidating
  try {
    const banners = await fetchFromNetwork();
    cacheSet(banners);
  } catch {
    // Silent — background refresh failure is non-critical
  }
}

/**
 * Preload banner images so they're in browser cache before render
 * @param {Array} banners
 */
export const preloadBannerImages = (banners) => {
  if (!banners?.length || typeof window === 'undefined') return;
  banners.forEach((b) => {
    const url = b.image_url || b.image;
    if (!url) return;
    const img = new window.Image();
    img.src = url;
    // Also preload mobile variant if different
    if (b.mobile_image_url && b.mobile_image_url !== url) {
      const mobileImg = new window.Image();
      mobileImg.src = b.mobile_image_url;
    }
  });
};

/**
 * Clear banner cache (call after admin writes)
 */
export const clearBannersCache = () => {
  cache.data = null;
  cache.ts = 0;
  inflightRequest = null;
};
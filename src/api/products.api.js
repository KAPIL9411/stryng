/**
 * Products API - Admin Write Operations + Non-Edge Reads
 * Read operations (public) → products-edge.api.js (cached, fast)
 * Write operations (admin) → this file (direct Supabase, cache-busting)
 * @module api/products
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';
import { inMemoryCache } from '../services/InMemoryCacheService';

// Re-export all public read functions from the optimized edge module
export {
  fetchProducts,
  fetchProductBySlug,
  fetchProductsByIds,
  clearProductsCache,
} from './products-edge.api';

// ─── Write operation timeouts ─────────────────────────────────────────────────
const WRITE_TIMEOUT_MS = 20000;
const DELETE_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

/**
 * Invalidate all product-related caches (memory + edge)
 */
async function invalidateAllCaches() {
  // Legacy InMemoryCache (if still in use elsewhere)
  inMemoryCache?.invalidatePattern?.('products:*');
  inMemoryCache?.invalidatePattern?.('product:*');

  // Edge module cache
  const { clearProductsCache } = await import('./products-edge.api');
  clearProductsCache();
}

// ─── Admin Read (bypasses cache - always fresh) ───────────────────────────────

/**
 * Fetch ALL products for admin panel (no pagination, no cache)
 * @returns {Promise<Array>}
 */
export const fetchAllProducts = async () => {
  try {
    const { data, error } = await withTimeout(
      supabase.from(API_ENDPOINTS.PRODUCTS).select('*').order('id').limit(2000),
      WRITE_TIMEOUT_MS,
      'fetchAllProducts'
    );

    if (error) throw new Error(error.message);
    return (data || []).map(normalizeAdminProduct);
  } catch (err) {
    console.error('❌ fetchAllProducts:', err.message);
    throw err;
  }
};

function normalizeAdminProduct(p) {
  return {
    id: p.id,
    name: p.name || 'Untitled Product',
    slug: p.slug || '',
    description: p.description || '',
    price: p.price || 0,
    originalPrice: p.original_price || p.price || 0,
    original_price: p.original_price || p.price || 0,
    discount: p.discount || 0,
    images: Array.isArray(p.images) ? p.images : p.images ? [p.images] : [],
    brand: p.brand || '',
    category: p.category || '',
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    isNew: p.is_new || false,
    isTrending: p.is_trending || false,
    is_new: p.is_new || false,
    is_trending: p.is_trending || false,
    rating: p.rating || 0,
    reviewCount: p.reviews_count || 0,
    reviews_count: p.reviews_count || 0,
    stock: p.stock ?? 0,
    lowStockThreshold: p.low_stock_threshold ?? 5,
    low_stock_threshold: p.low_stock_threshold ?? 5,
    sku: p.sku || '',
    track_inventory: p.track_inventory !== false,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new product
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
export const createProduct = async (productData) => {
  if (!productData?.name?.trim()) throw new Error('Product name is required');
  if (!productData?.slug?.trim()) throw new Error('Product slug is required');

  try {
    const { data, error } = await withTimeout(
      supabase.from(API_ENDPOINTS.PRODUCTS).insert([productData]).select().single(),
      WRITE_TIMEOUT_MS,
      'createProduct'
    );

    if (error) throw error;
    if (!data) throw new Error('No data returned after insert');

    await invalidateAllCaches();
    console.log('✅ Product created:', data.id);
    return data;
  } catch (err) {
    throw translateWriteError(err, 'create');
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing product
 * @param {string} id
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
export const updateProduct = async (id, productData) => {
  if (!id) throw new Error('Product ID is required');

  try {
    const { data, error } = await withTimeout(
      supabase.from(API_ENDPOINTS.PRODUCTS).update(productData).eq('id', id).select().single(),
      WRITE_TIMEOUT_MS,
      'updateProduct'
    );

    if (error) throw error;
    if (!data) throw new Error('Product not found or no rows updated');

    await invalidateAllCaches();
    console.log('✅ Product updated:', id);
    return data;
  } catch (err) {
    throw translateWriteError(err, 'update');
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a product
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  if (!id) throw new Error('Product ID is required');

  try {
    const { error } = await withTimeout(
      supabase.from(API_ENDPOINTS.PRODUCTS).delete().eq('id', id),
      DELETE_TIMEOUT_MS,
      'deleteProduct'
    );

    if (error) throw error;

    await invalidateAllCaches();
    console.log('✅ Product deleted:', id);
  } catch (err) {
    throw translateWriteError(err, 'delete');
  }
};

// ─── Search & Suggestions ─────────────────────────────────────────────────────

/**
 * Search products - delegates to fetchProducts with search filter
 */
export const searchProducts = async (page = 1, limit = 24, filters = {}) => {
  const { fetchProducts } = await import('./products-edge.api');
  return fetchProducts(page, limit, filters);
};

/**
 * Autocomplete suggestions (debounce on the caller side)
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getAutocompleteSuggestions = async (query, limit = 10) => {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('autocomplete_products', {
        search_prefix: trimmed,
        suggestion_limit: limit,
      }),
      5000,
      'autocomplete'
    );

    if (error) { console.error('Autocomplete error:', error.message); return []; }
    return data || [];
  } catch {
    return [];
  }
};

/**
 * Trending searches (cached, refreshed every 30 min)
 */
const _trendingCache = { data: null, ts: 0 };
const TRENDING_CACHE_TTL = 30 * 60 * 1000;

export const getTrendingSearches = async (daysBack = 7, limit = 10) => {
  if (_trendingCache.data && Date.now() - _trendingCache.ts < TRENDING_CACHE_TTL) {
    return _trendingCache.data;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_trending_searches', { days_back: daysBack, result_limit: limit }),
      8000,
      'trending searches'
    );

    if (error) { console.error('Trending searches error:', error.message); return []; }
    const result = data || [];
    _trendingCache.data = result;
    _trendingCache.ts = Date.now();
    return result;
  } catch {
    return _trendingCache.data || [];
  }
};

/**
 * Trending products (cached via SWR in edge module)
 */
export const fetchTrendingProducts = async (limit = 12) => {
  const { fetchProducts } = await import('./products-edge.api');
  try {
    // Use standard fetchProducts with isTrending filter
    // (edge function handles this path)
    const res = await fetchProducts(1, limit, { sort: 'popularity', isTrending: true });
    return res.products || [];
  } catch {
    return [];
  }
};

// ─── Error Translation ────────────────────────────────────────────────────────
function translateWriteError(err, operation) {
  const msg = err?.message || '';
  const code = err?.code || '';

  if (code === '23505') {
    if (msg.includes('slug')) return new Error('A product with this name already exists.');
    if (msg.includes('sku')) return new Error('A product with this SKU already exists.');
    return new Error('This product already exists in the database.');
  }
  if (msg.includes('timeout')) {
    return new Error(`Unable to ${operation} product — request timed out. Please try again.`);
  }
  if (msg.includes('not found') || msg.includes('no rows')) {
    return new Error('Product not found. It may have been deleted.');
  }
  if (msg.includes('JWT') || msg.includes('auth')) {
    return new Error('Session expired. Please refresh the page and try again.');
  }
  // Return original error for unexpected cases (don't swallow stack traces in dev)
  return err;
}
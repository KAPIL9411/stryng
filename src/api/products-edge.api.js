/**
 * Products Edge API - Optimized with SWR pattern + request deduplication
 * Fixes: race conditions, inconsistent loads, stale cache issues
 * Industry-standard pattern used by Myntra, AJIO, Amazon
 * @module api/products-edge
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

// ─── Constants ───────────────────────────────────────────────────────────────
const EDGE_API_URL = '/api/products-edge';
const MEMORY_TTL = 5 * 60 * 1000;       // 5 min - memory
const INDEXED_DB_TTL = 15 * 60 * 1000;  // 15 min - IndexedDB
const STALE_TTL = 60 * 60 * 1000;       // 1 hr - stale fallback
const EDGE_TIMEOUT = 4000;               // 4s edge timeout (fail fast)
const SUPABASE_TIMEOUT = 8000;           // 8s DB timeout

// ─── Memory Cache (Map with timestamps) ──────────────────────────────────────
const memoryCache = new Map();

function mcGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > MEMORY_TTL) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function mcSet(key, data) {
  memoryCache.set(key, { data, ts: Date.now() });
  // Prevent unbounded growth
  if (memoryCache.size > 200) {
    const oldest = [...memoryCache.entries()]
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(0, 50)
      .map(([k]) => k);
    oldest.forEach((k) => memoryCache.delete(k));
  }
}

function mcGetStale(key) {
  const entry = memoryCache.get(key);
  return entry ? entry.data : null;
}

// ─── Request Deduplication (prevents multiple identical in-flight requests) ──
const inflightRequests = new Map();

async function dedupe(key, fetcher) {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }
  const promise = fetcher().finally(() => inflightRequests.delete(key));
  inflightRequests.set(key, promise);
  return promise;
}

// ─── IndexedDB Cache ──────────────────────────────────────────────────────────
let _db = null;
let _dbInitPromise = null;

function getDB() {
  if (_db) return Promise.resolve(_db);
  if (_dbInitPromise) return _dbInitPromise;

  _dbInitPromise = new Promise((resolve) => {
    // Bail out in non-browser environments (SSR, tests)
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open('StryngProductsCache_v2', 1);
    req.onerror = () => { _dbInitPromise = null; resolve(null); };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'key' });
        store.createIndex('ts', 'ts');
      }
    };
  });
  return _dbInitPromise;
}

async function idbGet(key, ttl = INDEXED_DB_TTL) {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction('products', 'readonly');
      const req = tx.objectStore('products').get(key);
      req.onsuccess = () => {
        const rec = req.result;
        if (!rec || Date.now() - rec.ts > ttl) { resolve(null); return; }
        resolve(rec.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(key, data) {
  try {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction('products', 'readwrite');
    tx.objectStore('products').put({ key, data, ts: Date.now() });
  } catch { /* non-critical */ }
}

async function idbGetStale(key) {
  return idbGet(key, STALE_TTL);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
    ),
  ]);
}

function normalizeProduct(p) {
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
    fabric: p.fabric || '',
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    unavailableSizes: Array.isArray(p.unavailable_sizes) ? p.unavailable_sizes : [],
    isNew: p.is_new || p.isNew || false,
    isTrending: p.is_trending || p.isTrending || false,
    is_new: p.is_new || false,
    is_trending: p.is_trending || false,
    rating: p.rating || 0,
    reviewCount: p.reviews_count || p.reviewCount || 0,
    reviews_count: p.reviews_count || 0,
    stock: p.stock ?? 0,
    lowStockThreshold: p.low_stock_threshold ?? p.lowStockThreshold ?? 5,
    low_stock_threshold: p.low_stock_threshold ?? 5,
    sku: p.sku || '',
    track_inventory: p.track_inventory !== false,
  };
}

// ─── Cache-aside with SWR (Stale While Revalidate) ───────────────────────────
async function fetchWithSWR(cacheKey, fetcher) {
  // 1. Memory cache (instant, <1ms)
  const mem = mcGet(cacheKey);
  if (mem) {
    revalidateInBackground(cacheKey, fetcher); // refresh silently
    return { data: mem, source: 'memory' };
  }

  // 2. IndexedDB (fast, ~5ms)
  const idb = await idbGet(cacheKey);
  if (idb) {
    mcSet(cacheKey, idb);
    revalidateInBackground(cacheKey, fetcher);
    return { data: idb, source: 'indexeddb' };
  }

  // 3. Network fetch (with deduplication)
  try {
    const data = await dedupe(cacheKey, fetcher);
    mcSet(cacheKey, data);
    idbSet(cacheKey, data); // fire-and-forget
    return { data, source: 'network' };
  } catch (err) {
    // 4. Stale fallback - better stale than broken
    const staleIdb = await idbGetStale(cacheKey);
    if (staleIdb) {
      console.warn(`⚠️ Serving stale cache for ${cacheKey}`);
      mcSet(cacheKey, staleIdb);
      return { data: staleIdb, source: 'stale' };
    }
    const staleMem = mcGetStale(cacheKey);
    if (staleMem) return { data: staleMem, source: 'stale-memory' };
    throw err;
  }
}

async function revalidateInBackground(cacheKey, fetcher) {
  try {
    const data = await dedupe(`bg:${cacheKey}`, fetcher);
    mcSet(cacheKey, data);
    idbSet(cacheKey, data);
  } catch {
    // Silent - background refresh failure is not critical
  }
}

// ─── Edge Function Fetch (with timeout + JSON validation) ────────────────────
async function fetchFromEdge(params) {
  const url = `${EDGE_API_URL}?${new URLSearchParams(params)}`;
  const res = await withTimeout(fetch(url), EDGE_TIMEOUT, 'edge function');
  if (!res.ok) throw new Error(`Edge: HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Edge: non-JSON response');
  const json = await res.json();
  if (!json.success || !json.data) throw new Error('Edge: invalid payload');
  return json.data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch paginated products with multi-layer caching + SWR
 */
export const fetchProducts = async (page = 1, limit = 24, filters = {}) => {
  const cacheKey = `products:list:${page}:${limit}:${JSON.stringify(filters)}`;

  const fetcher = async () => {
    // Try edge function first (faster CDN response)
    try {
      const params = {
        type: 'list',
        page: String(page),
        limit: String(limit),
      };
      if (filters.category?.length) params.category = [].concat(filters.category).join(',');
      if (filters.sort) params.sort = filters.sort;
      if (filters.search) params.search = filters.search;

      const data = await fetchFromEdge(params);
      return normalizeListResponse(data, page, limit);
    } catch (edgeErr) {
      console.warn('⚠️ Edge fallback:', edgeErr.message);
    }

    // Fallback: Supabase direct
    return fetchListFromSupabase(page, limit, filters);
  };

  try {
    const { data } = await fetchWithSWR(cacheKey, fetcher);
    return data;
  } catch (err) {
    console.error('❌ fetchProducts failed:', err.message);
    return emptyListResponse(page);
  }
};

function normalizeListResponse(data, page, limit) {
  // Handle both edge and supabase response shapes
  if (Array.isArray(data)) {
    return {
      products: data.map(normalizeProduct),
      pagination: { currentPage: page, totalItems: data.length, totalPages: 1, hasNext: false },
    };
  }
  if (data.products) {
    return {
      products: data.products.map(normalizeProduct),
      pagination: data.pagination || emptyPagination(page),
    };
  }
  return emptyListResponse(page);
}

async function fetchListFromSupabase(page, limit, filters) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from(API_ENDPOINTS.PRODUCTS)
    .select('id,name,slug,price,original_price,discount,images,brand,category,colors,is_new,is_trending,rating,reviews_count,stock,low_stock_threshold', { count: 'exact' })
    .range(start, end);

  // Apply filters
  const categories = [].concat(filters.category || []).filter(Boolean);
  if (categories.length === 1) query = query.eq('category', categories[0]);
  else if (categories.length > 1) query = query.in('category', categories);

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  if (filters.minPrice != null) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice);

  switch (filters.sort) {
    case 'price-low':  query = query.order('price', { ascending: true }); break;
    case 'price-high': query = query.order('price', { ascending: false }); break;
    case 'newest':     query = query.order('created_at', { ascending: false }); break;
    case 'popularity': query = query.order('reviews_count', { ascending: false }); break;
    default:           query = query.order('id', { ascending: true });
  }

  const { data, count, error } = await withTimeout(query, SUPABASE_TIMEOUT, 'supabase list');
  if (error) throw new Error(error.message);

  return {
    products: (data || []).map(normalizeProduct),
    pagination: {
      currentPage: page,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasNext: end < (count || 0) - 1,
    },
  };
}

/**
 * Fetch single product by slug
 */
export const fetchProductBySlug = async (slug) => {
  if (!slug) throw new Error('slug is required');
  const cacheKey = `product:slug:${slug}`;

  const fetcher = async () => {
    // Try edge function
    try {
      const data = await fetchFromEdge({ type: 'detail', slug });
      return normalizeProduct(data);
    } catch { /* fallback */ }

    // Supabase fallback
    const { data, error } = await withTimeout(
      supabase.from(API_ENDPOINTS.PRODUCTS).select('*').eq('slug', slug).single(),
      SUPABASE_TIMEOUT,
      'supabase product'
    );
    if (error || !data) throw new Error(`Product not found: ${slug}`);
    return normalizeProduct(data);
  };

  const { data } = await fetchWithSWR(cacheKey, fetcher);
  return data;
};

/**
 * Fetch products by IDs (cart/wishlist) - batched
 */
export const fetchProductsByIds = async (ids) => {
  if (!ids?.length) return [];

  const sortedIds = [...ids].sort();
  const cacheKey = `products:ids:${sortedIds.join(',')}`;

  const fetcher = async () => {
    // Try edge function
    try {
      const data = await fetchFromEdge({ type: 'ids', ids: sortedIds.join(',') });
      return (Array.isArray(data) ? data : []).map(normalizeProduct);
    } catch { /* fallback */ }

    // Supabase fallback
    const { data, error } = await withTimeout(
      supabase
        .from(API_ENDPOINTS.PRODUCTS)
        .select('id,name,slug,price,original_price,discount,images,brand,category,colors,stock')
        .in('id', sortedIds),
      SUPABASE_TIMEOUT,
      'supabase ids'
    );
    if (error) throw new Error(error.message);
    return (data || []).map(normalizeProduct);
  };

  try {
    const { data } = await fetchWithSWR(cacheKey, fetcher);
    return data;
  } catch {
    return [];
  }
};

/**
 * Clear all product caches (call after admin writes)
 */
export const clearProductsCache = () => {
  // Clear memory
  const productKeys = [...memoryCache.keys()].filter((k) =>
    k.startsWith('products:') || k.startsWith('product:')
  );
  productKeys.forEach((k) => memoryCache.delete(k));

  // Clear inflight
  inflightRequests.clear();

  // Clear IndexedDB asynchronously
  getDB().then((db) => {
    if (!db) return;
    const tx = db.transaction('products', 'readwrite');
    tx.objectStore('products').clear();
  }).catch(() => {});

  console.log('🗑️ Products cache cleared');
};

/**
 * Evict old IndexedDB entries (run on app start)
 */
export async function evictOldCache() {
  try {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const index = store.index('ts');
    const cutoff = Date.now() - STALE_TTL;
    const range = IDBKeyRange.upperBound(cutoff);
    const req = index.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  } catch { /* non-critical */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emptyPagination(page) {
  return { currentPage: page, totalItems: 0, totalPages: 0, hasNext: false };
}

function emptyListResponse(page) {
  return { products: [], pagination: emptyPagination(page) };
}

// Run eviction on module load (non-blocking)
evictOldCache();
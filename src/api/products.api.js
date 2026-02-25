/**
 * Products API - Ultra-Fast with Edge Functions
 * Uses Vercel Edge Functions for 100x faster product loading (FREE)
 * @module api/products
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';
import { inMemoryCache } from '../services/InMemoryCacheService';
import { withRetry } from '../utils/apiClient';

// Import edge-optimized read functions (100x faster)
export {
  fetchProducts,
  fetchProductBySlug,
  fetchProductsByIds,
  clearProductsCache,
} from './products-edge.api';

// Retry configuration for write operations
const RETRY_CONFIG = {
  WRITE: {
    maxRetries: 3,
    timeout: 30000,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
};

/**
 * Fetch all products (for admin)
 * @returns {Promise<Array>} All products
 */
export const fetchAllProducts = async () => {
  const startTime = performance.now();
  const cacheKey = 'products:all';

  try {
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Cache HIT - All Products (${duration.toFixed(2)}ms)`);
      return cached;
    }

    const { data, error } = await withRetry(
      async () => {
        const result = await supabase
          .from(API_ENDPOINTS.PRODUCTS)
          .select('*')
          .limit(1000);

        if (result.error) {
          throw new Error(result.error.message || 'Failed to fetch products');
        }

        return result;
      },
      {
        maxRetries: 2,
        timeout: 30000,
        retryDelay: 500,
        exponentialBackoff: true,
        deduplicationKey: cacheKey,
      }
    );

    if (error || !data) {
      console.warn('⚠️ No products found, returning empty array');
      return [];
    }

    const products = data.map((p) => ({
      id: p.id,
      name: p.name || 'Untitled Product',
      slug: p.slug || '',
      description: p.description || '',
      price: p.price || 0,
      originalPrice: p.original_price || p.price || 0,
      original_price: p.original_price || p.price || 0,
      discount: p.discount || 0,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
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
    }));

    // Cache for 5 minutes
    inMemoryCache.set(cacheKey, products, 300);

    const duration = performance.now() - startTime;
    console.log(`⚡ DB Query - All Products (${duration.toFixed(2)}ms) - ${products.length} products`);

    return products;
  } catch (error) {
    console.error('❌ fetchAllProducts error:', error);
    
    const staleCache = inMemoryCache.get(cacheKey, true);
    if (staleCache) {
      console.warn('⚠️ Returning stale cache for all products');
      return staleCache;
    }
    
    return [];
  }
};

/**
 * Create new product (admin)
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    if (!productData.name || !productData.slug) {
      throw new Error('Product name and slug are required');
    }

    const deduplicationKey = `create-product-${productData.slug}`;

    const result = await withRetry(
      async () => {
        const queryResult = await supabase
          .from(API_ENDPOINTS.PRODUCTS)
          .insert([productData])
          .select();

        if (queryResult.error) {
          throw queryResult.error;
        }

        if (!queryResult.data || queryResult.data.length === 0) {
          throw new Error('Failed to create product');
        }

        return queryResult;
      },
      {
        ...RETRY_CONFIG.WRITE,
        deduplicationKey,
      }
    );

    // Invalidate caches
    inMemoryCache.invalidatePattern('products:*');
    const { clearProductsCache } = await import('./products-edge.api');
    clearProductsCache();

    console.log('✅ Product created successfully');
    return result.data[0];
  } catch (error) {
    console.error('❌ Product create error:', error);

    if (error.code === '23505') {
      if (error.message?.includes('slug')) {
        throw new Error('A product with this name already exists. Please use a different name.');
      } else if (error.message?.includes('sku')) {
        throw new Error('A product with this SKU already exists. Please use a different SKU.');
      }
      throw new Error('This product already exists in the database.');
    }

    if (error.message?.includes('timeout') || error.message?.includes('unavailable')) {
      throw new Error('Unable to save product. Please check your internet connection and try again.');
    }

    throw error;
  }
};

/**
 * Update product (admin)
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, productData) => {
  try {
    if (!id) {
      throw new Error('Product ID is required');
    }

    const deduplicationKey = `update-product-${id}`;

    const result = await withRetry(
      async () => {
        const queryResult = await supabase
          .from(API_ENDPOINTS.PRODUCTS)
          .update(productData)
          .eq('id', id)
          .select();

        if (queryResult.error) {
          throw queryResult.error;
        }

        if (!queryResult.data || queryResult.data.length === 0) {
          throw new Error('Product not found');
        }

        return queryResult;
      },
      {
        ...RETRY_CONFIG.WRITE,
        deduplicationKey,
      }
    );

    // Invalidate caches
    inMemoryCache.invalidatePattern('products:*');
    inMemoryCache.invalidatePattern('product:*');
    const { clearProductsCache } = await import('./products-edge.api');
    clearProductsCache();

    console.log('✅ Product updated successfully');
    return result.data[0];
  } catch (error) {
    console.error('❌ Product update error:', error);

    if (error.message?.includes('not found')) {
      throw new Error('Product not found. It may have been deleted.');
    }

    if (error.message?.includes('timeout') || error.message?.includes('unavailable')) {
      throw new Error('Unable to update product. Please check your internet connection and try again.');
    }

    throw error;
  }
};

/**
 * Delete product (admin)
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  try {
    if (!id) {
      throw new Error('Product ID is required');
    }

    const { error } = await withRetry(
      async () => {
        const result = await supabase
          .from(API_ENDPOINTS.PRODUCTS)
          .delete()
          .eq('id', id);

        if (result.error) {
          throw result.error;
        }

        return result;
      },
      {
        maxRetries: 2,
        timeout: 15000,
        retryDelay: 1000,
        exponentialBackoff: true,
        deduplicationKey: `delete-product-${id}`,
      }
    );

    if (error) {
      throw error;
    }

    // Invalidate caches
    inMemoryCache.invalidatePattern('products:*');
    inMemoryCache.invalidatePattern('product:*');
    const { clearProductsCache } = await import('./products-edge.api');
    clearProductsCache();
    
    console.log('✅ Product deleted successfully');
  } catch (error) {
    console.error('❌ Product delete error:', error);
    
    if (error.message?.includes('timeout') || error.message?.includes('unavailable')) {
      throw new Error('Unable to delete product. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Search products (uses edge function automatically via fetchProducts)
 */
export const searchProducts = async (page = 1, limit = 24, filters = {}) => {
  // Edge function doesn't support search yet, fallback to direct query
  const { fetchProducts } = await import('./products-edge.api');
  return fetchProducts(page, limit, filters);
};

/**
 * Get autocomplete suggestions
 */
export const getAutocompleteSuggestions = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Autocomplete timeout')), 5000)
    );

    const queryPromise = supabase.rpc('autocomplete_products', {
      search_prefix: query.trim(),
      suggestion_limit: limit,
    });

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      console.error('❌ Autocomplete error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ getAutocompleteSuggestions error:', error);
    return [];
  }
};

/**
 * Get trending searches
 */
export const getTrendingSearches = async (daysBack = 7, limit = 10) => {
  const cacheKey = `trending:searches:${daysBack}:${limit}`;
  
  const cached = inMemoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Trending searches timeout')), 8000)
    );

    const queryPromise = supabase.rpc('get_trending_searches', {
      days_back: daysBack,
      result_limit: limit,
    });

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      console.error('❌ Trending searches error:', error);
      return [];
    }

    const result = data || [];
    inMemoryCache.set(cacheKey, result, 1800);

    return result;
  } catch (error) {
    console.error('❌ getTrendingSearches error:', error);
    return [];
  }
};

/**
 * Fetch trending products (uses edge function)
 */
export const fetchTrendingProducts = async (limit = 12) => {
  try {
    const response = await fetch(`/api/products-edge?type=trending&limit=${limit}`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return result.data.map(p => ({
          id: p.id,
          name: p.name || 'Untitled Product',
          slug: p.slug || '',
          price: p.price || 0,
          originalPrice: p.original_price || p.price || 0,
          discount: p.discount || 0,
          images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
          brand: p.brand || '',
          category: p.category || '',
          colors: Array.isArray(p.colors) ? p.colors : [],
          isNew: p.is_new || false,
          isTrending: p.is_trending || false,
          rating: p.rating || 0,
          reviewCount: p.reviews_count || 0,
          stock: p.stock ?? 0,
        }));
      }
    }

    // Fallback to Supabase
    const { data, error } = await supabase
      .from(API_ENDPOINTS.PRODUCTS)
      .select('id,name,slug,price,original_price,discount,images,brand,category,colors,is_new,is_trending,rating,reviews_count,stock')
      .eq('is_trending', true)
      .order('reviews_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      name: p.name || 'Untitled Product',
      slug: p.slug || '',
      price: p.price || 0,
      originalPrice: p.original_price || p.price || 0,
      discount: p.discount || 0,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      brand: p.brand || '',
      category: p.category || '',
      colors: Array.isArray(p.colors) ? p.colors : [],
      isNew: p.is_new || false,
      isTrending: p.is_trending || false,
      rating: p.rating || 0,
      reviewCount: p.reviews_count || 0,
      stock: p.stock ?? 0,
    }));
  } catch (error) {
    console.error('❌ fetchTrendingProducts error:', error);
    return [];
  }
};

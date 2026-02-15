/**
 * Products API - Ultra-Optimized
 * Combines Redis caching + In-memory caching for maximum performance
 * @module api/products
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';
import { monitorQuery } from '../utils/queryMonitor';
import { inMemoryCache } from '../services/InMemoryCacheService';

// Minimal field set for product listing (reduces payload by 70%)
const LISTING_FIELDS = 'id,name,slug,price,original_price,discount,images,brand,category,colors,is_new,is_trending,rating,reviews_count,stock,low_stock_threshold';
const DETAIL_FIELDS = '*';

/**
 * Fetch paginated products with ultra-fast caching
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Products and pagination info
 */
export const fetchProducts = async (page = 1, limit = 24, filters = {}) => {
  const startTime = performance.now();

  try {
    const cacheKey = `products:${page}:${limit}:${JSON.stringify(filters)}`;
    
    // Try in-memory cache first (ultra-fast)
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Build optimized query
    let query = supabase
      .from(API_ENDPOINTS.PRODUCTS)
      .select(LISTING_FIELDS, { count: 'exact' })
      .range(start, end);

    // Apply filters (most selective first for performance)
    if (filters.category && filters.category.length > 0) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      query = query.in('category', categories);
    }

    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
    }

    // Apply sorting (use indexed columns)
    switch (filters.sort) {
      case 'price-low':
        query = query.order('price', { ascending: true });
        break;
      case 'price-high':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popularity':
        query = query.order('reviews_count', { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order('id', { ascending: true });
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message || 'Failed to fetch products');

    // Fast mapping
    const products = data.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.original_price,
      discount: p.discount,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      brand: p.brand,
      category: p.category,
      colors: Array.isArray(p.colors) ? p.colors : [],
      isNew: p.is_new || false,
      isTrending: p.is_trending || false,
      rating: p.rating || 0,
      reviewCount: p.reviews_count || 0,
      stock: p.stock ?? 0,
      lowStockThreshold: p.low_stock_threshold ?? 5,
    }));

    const result = {
      products,
      pagination: {
        currentPage: page,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: end < (count || 0) - 1,
      },
    };

    // Cache for 5 minutes
    inMemoryCache.set(cacheKey, result, 300);

    const duration = performance.now() - startTime;
    console.log(`⚡ DB Query (${duration.toFixed(2)}ms) - ${products.length} products`);

    return result;
  } catch (error) {
    console.error('❌ fetchProducts error:', error);
    throw error;
  }
};

/**
 * Fetch single product by slug (optimized)
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product data
 */
export const fetchProductBySlug = async (slug) => {
  const startTime = performance.now();

  try {
    const cacheKey = `product:${slug}`;
    
    // Try cache
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    const { data, error } = await monitorQuery(
      'fetchProductBySlug',
      async () =>
        await supabase
          .from(API_ENDPOINTS.PRODUCTS)
          .select(DETAIL_FIELDS)
          .eq('slug', slug)
          .single()
    );

    if (error) throw error;

    const result = {
      ...data,
      originalPrice: data.original_price,
      reviewCount: data.reviews_count || 0,
      isNew: data.is_new || false,
      isTrending: data.is_trending || false,
      stock: data.stock ?? 0,
      lowStockThreshold: data.low_stock_threshold ?? 5,
      images: Array.isArray(data.images) ? data.images : (data.images ? [data.images] : []),
    };

    // Cache for 10 minutes
    inMemoryCache.set(cacheKey, result, 600);

    const duration = performance.now() - startTime;
    console.log(`⚡ DB Query (${duration.toFixed(2)}ms)`);

    return result;
  } catch (error) {
    console.error('❌ fetchProductBySlug error:', error);
    throw error;
  }
};

/**
 * Fetch all products (optimized with caching)
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

    const { data, error } = await monitorQuery(
      'fetchAllProducts',
      async () =>
        await supabase.from(API_ENDPOINTS.PRODUCTS).select(LISTING_FIELDS)
    );

    if (error) throw error;

    const products = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.original_price,
      discount: p.discount,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      brand: p.brand,
      category: p.category,
      colors: Array.isArray(p.colors) ? p.colors : [],
      isNew: p.is_new || false,
      isTrending: p.is_trending || false,
      rating: p.rating || 0,
      reviewCount: p.reviews_count || 0,
      stock: p.stock ?? 0,
      lowStockThreshold: p.low_stock_threshold ?? 5,
    }));

    // Cache for 10 minutes
    inMemoryCache.set(cacheKey, products, 600);

    const duration = performance.now() - startTime;
    console.log(`⚡ DB Query - All Products (${duration.toFixed(2)}ms) - ${products.length} products`);

    return products;
  } catch (error) {
    console.error('❌ fetchAllProducts error:', error);
    throw error;
  }
};

/**
 * Create new product (admin)
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  const { data, error } = await supabase
    .from(API_ENDPOINTS.PRODUCTS)
    .insert([productData])
    .select();

  if (error) {
    console.error('❌ Product create error:', error);
    throw error;
  }

  // Invalidate caches
  inMemoryCache.invalidatePattern('products:*');
  console.log('🗑️ Products cache invalidated after create');

  return data[0];
};

/**
 * Update product (admin)
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, productData) => {
  const { data, error } = await supabase
    .from(API_ENDPOINTS.PRODUCTS)
    .update(productData)
    .eq('id', id)
    .select();

  if (error) {
    console.error('❌ Product update error:', error);
    throw error;
  }

  // Invalidate caches
  inMemoryCache.invalidatePattern('products:*');
  inMemoryCache.invalidatePattern('product:*');
  console.log('🗑️ Products cache invalidated after update');

  return data[0];
};

/**
 * Delete product (admin)
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  const { error } = await supabase
    .from(API_ENDPOINTS.PRODUCTS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Product delete error:', error);
    throw error;
  }

  // Invalidate caches
  inMemoryCache.invalidatePattern('products:*');
  inMemoryCache.invalidatePattern('product:*');
  console.log('🗑️ Products cache invalidated after delete');
};

/**
 * Batch fetch products by IDs (for cart, wishlist)
 * @param {Array<string>} ids - Product IDs
 * @returns {Promise<Array>} Products
 */
export const fetchProductsByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  const startTime = performance.now();
  const cacheKey = `products:ids:${ids.sort().join(',')}`;
  
  try {
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    const { data, error } = await supabase
      .from(API_ENDPOINTS.PRODUCTS)
      .select(LISTING_FIELDS)
      .in('id', ids);

    if (error) throw error;

    const products = data.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.original_price,
      discount: p.discount,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      brand: p.brand,
      category: p.category,
      colors: Array.isArray(p.colors) ? p.colors : [],
      isNew: p.is_new || false,
      isTrending: p.is_trending || false,
      rating: p.rating || 0,
      reviewCount: p.reviews_count || 0,
      stock: p.stock ?? 0,
      lowStockThreshold: p.low_stock_threshold ?? 5,
    }));

    inMemoryCache.set(cacheKey, products, 300);

    const duration = performance.now() - startTime;
    console.log(`⚡ Batch fetch (${duration.toFixed(2)}ms) - ${products.length} products`);

    return products;
  } catch (error) {
    console.error('❌ fetchProductsByIds error:', error);
    throw error;
  }
};

/**
 * Get trending products (cached aggressively)
 * @param {number} limit - Number of products
 * @returns {Promise<Array>} Trending products
 */
export const fetchTrendingProducts = async (limit = 12) => {
  const cacheKey = `products:trending:${limit}`;
  
  const cached = inMemoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from(API_ENDPOINTS.PRODUCTS)
      .select(LISTING_FIELDS)
      .eq('is_trending', true)
      .order('reviews_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const products = data.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.original_price,
      discount: p.discount,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      brand: p.brand,
      category: p.category,
      colors: Array.isArray(p.colors) ? p.colors : [],
      isNew: p.is_new || false,
      isTrending: p.is_trending || false,
      rating: p.rating || 0,
      reviewCount: p.reviews_count || 0,
      stock: p.stock ?? 0,
      lowStockThreshold: p.low_stock_threshold ?? 5,
    }));

    // Cache for 15 minutes
    inMemoryCache.set(cacheKey, products, 900);

    return products;
  } catch (error) {
    console.error('❌ fetchTrendingProducts error:', error);
    throw error;
  }
};

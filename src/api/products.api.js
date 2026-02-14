/**
 * Products API
 * All product-related API calls
 * @module api/products
 */

import { supabase } from '../lib/supabaseClient';
import { API_ENDPOINTS } from '../config/constants';

/**
 * Fetch paginated products with filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Products and pagination info
 */
export const fetchProducts = async (page = 1, limit = 24, filters = {}) => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Build query with only needed fields for listing
    let query = supabase
        .from(API_ENDPOINTS.PRODUCTS)
        .select('id, name, slug, price, original_price, discount, images, brand, category, colors, is_new, is_trending, rating, reviews_count', { count: 'exact' })
        .range(start, end);

    // Apply server-side filters
    if (filters.category && filters.category.length > 0) {
        query = query.in('category', Array.isArray(filters.category) ? filters.category : [filters.category]);
    }
    
    if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
    }
    
    if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
    }
    
    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    if (filters.sizes && filters.sizes.length > 0) {
        query = query.contains('sizes', filters.sizes);
    }

    // Apply sorting
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
            query = query.order('reviews_count', { ascending: false });
            break;
        default:
            query = query.order('id', { ascending: true });
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('❌ Products fetch error:', error);
        throw error;
    }

    // Map snake_case to camelCase
    const mappedProducts = (data || []).map(p => ({
        ...p,
        originalPrice: p.original_price,
        reviewCount: p.reviews_count || 0,
        isNew: p.is_new || false,
        isTrending: p.is_trending || false,
    }));

    return {
        products: mappedProducts,
        pagination: {
            currentPage: page,
            totalItems: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            hasNext: end < (count || 0) - 1,
        }
    };
};

/**
 * Fetch single product by slug
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product data
 */
export const fetchProductBySlug = async (slug) => {
    const { data, error } = await supabase
        .from(API_ENDPOINTS.PRODUCTS)
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('❌ Product fetch error:', error);
        throw error;
    }

    // Map snake_case to camelCase
    return {
        ...data,
        originalPrice: data.original_price,
        reviewCount: data.reviews_count || 0,
        isNew: data.is_new || false,
        isTrending: data.is_trending || false,
    };
};

/**
 * Fetch all products (for legacy support)
 * @returns {Promise<Array>} All products
 */
export const fetchAllProducts = async () => {
    const { data, error } = await supabase
        .from(API_ENDPOINTS.PRODUCTS)
        .select('*');

    if (error) {
        console.error('❌ Products fetch error:', error);
        throw error;
    }

    // Map snake_case to camelCase
    return (data || []).map(p => ({
        ...p,
        originalPrice: p.original_price,
        reviewCount: p.reviews_count || 0,
        isNew: p.is_new || false,
        isTrending: p.is_trending || false,
    }));
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
};

/**
 * Products API - Firebase Firestore
 * Optimized for performance with caching and batch operations
 * @module api/products
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import {
  COLLECTIONS,
  getDocument,
  getDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  getPaginatedDocuments,
} from '../lib/firestoreHelpers';

/**
 * Fetch all products with filters and pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { products, pagination }
 */
export const fetchProducts = async (options = {}) => {
  try {
    const {
      page = 1,
      pageSize = 24,
      category = null,
      search = null,
      sort = 'newest',
      minPrice = null,
      maxPrice = null,
      isNew = null,
      isTrending = null,
    } = options;

    const whereClause = [];
    
    // Apply filters
    if (category) {
      whereClause.push(['category', '==', category]);
    }
    if (isNew !== null) {
      whereClause.push(['is_new', '==', isNew]);
    }
    if (isTrending !== null) {
      whereClause.push(['is_trending', '==', isTrending]);
    }
    if (minPrice !== null) {
      whereClause.push(['price', '>=', minPrice]);
    }
    if (maxPrice !== null) {
      whereClause.push(['price', '<=', maxPrice]);
    }

    // Apply sorting
    const orderByClause = [];
    switch (sort) {
      case 'price-low':
        orderByClause.push(['price', 'asc']);
        break;
      case 'price-high':
        orderByClause.push(['price', 'desc']);
        break;
      case 'newest':
        orderByClause.push(['created_at', 'desc']);
        break;
      case 'popularity':
        orderByClause.push(['reviews_count', 'desc']);
        break;
      default:
        orderByClause.push(['created_at', 'desc']);
    }

    // Get paginated results
    const { documents: products, hasMore } = await getPaginatedDocuments(
      COLLECTIONS.PRODUCTS,
      {
        pageSize,
        where: whereClause,
        orderBy: orderByClause,
      }
    );

    // Client-side search filter (Firestore doesn't support full-text search)
    let filteredProducts = products;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower)
      );
    }

    return {
      products: filteredProducts,
      pagination: {
        currentPage: page,
        totalItems: filteredProducts.length,
        hasNext: hasMore,
      },
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { products: [], pagination: { currentPage: 1, totalItems: 0, hasNext: false } };
  }
};

/**
 * Fetch single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product data
 */
export const fetchProductById = async (productId) => {
  try {
    return await getDocument(COLLECTIONS.PRODUCTS, productId);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

/**
 * Fetch single product by slug
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product data
 */
export const fetchProductBySlug = async (slug) => {
  try {
    const products = await getDocuments(COLLECTIONS.PRODUCTS, {
      where: [['slug', '==', slug]],
      limit: 1,
    });
    return products[0] || null;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
};

/**
 * Fetch multiple products by IDs (for cart/wishlist)
 * @param {Array<string>} productIds - Array of product IDs
 * @returns {Promise<Array>} Array of products
 */
export const fetchProductsByIds = async (productIds) => {
  try {
    if (!productIds || productIds.length === 0) return [];
    
    // Firestore 'in' query supports max 10 items, so batch if needed
    const batches = [];
    for (let i = 0; i < productIds.length; i += 10) {
      const batch = productIds.slice(i, i + 10);
      batches.push(
        getDocuments(COLLECTIONS.PRODUCTS, {
          where: [['__name__', 'in', batch]],
        })
      );
    }
    
    const results = await Promise.all(batches);
    return results.flat();
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    return [];
  }
};

/**
 * Create a new product (Admin only)
 * @param {Object} productData - Product data
 * @returns {Promise<string>} New product ID
 */
export const createProduct = async (productData) => {
  try {
    const productId = await addDocument(COLLECTIONS.PRODUCTS, {
      ...productData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    console.log('✅ Product created:', productId);
    return productId;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update a product (Admin only)
 * @param {string} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<void>}
 */
export const updateProduct = async (productId, productData) => {
  try {
    await updateDocument(COLLECTIONS.PRODUCTS, productId, {
      ...productData,
      updated_at: serverTimestamp(),
    });
    
    console.log('✅ Product updated:', productId);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Delete a product (Admin only)
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  try {
    await deleteDocument(COLLECTIONS.PRODUCTS, productId);
    console.log('✅ Product deleted:', productId);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

/**
 * Fetch all products (Admin only - no pagination)
 * @returns {Promise<Array>} All products
 */
export const fetchAllProducts = async () => {
  try {
    return await getDocuments(COLLECTIONS.PRODUCTS, {
      orderBy: [['created_at', 'desc']],
    });
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
};

/**
 * Search products by name/description
 * @param {string} searchTerm - Search term
 * @param {number} limitResults - Max results
 * @returns {Promise<Array>} Matching products
 */
export const searchProducts = async (searchTerm, limitResults = 20) => {
  try {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    // Get all products and filter client-side
    // (Firestore doesn't support full-text search natively)
    const allProducts = await getDocuments(COLLECTIONS.PRODUCTS, {
      limit: 100, // Limit initial fetch
    });
    
    const searchLower = searchTerm.toLowerCase();
    return allProducts
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower)
      )
      .slice(0, limitResults);
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};

/**
 * Get trending products
 * @param {number} limitResults - Max results
 * @returns {Promise<Array>} Trending products
 */
export const fetchTrendingProducts = async (limitResults = 12) => {
  try {
    return await getDocuments(COLLECTIONS.PRODUCTS, {
      where: [['is_trending', '==', true]],
      orderBy: [['reviews_count', 'desc']],
      limit: limitResults,
    });
  } catch (error) {
    console.error('Error fetching trending products:', error);
    return [];
  }
};

/**
 * Get new arrivals
 * @param {number} limitResults - Max results
 * @returns {Promise<Array>} New products
 */
export const fetchNewArrivals = async (limitResults = 12) => {
  try {
    return await getDocuments(COLLECTIONS.PRODUCTS, {
      where: [['is_new', '==', true]],
      orderBy: [['created_at', 'desc']],
      limit: limitResults,
    });
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return [];
  }
};

/**
 * Update product stock
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add/subtract
 * @returns {Promise<void>}
 */
export const updateProductStock = async (productId, quantity) => {
  try {
    const product = await getDocument(COLLECTIONS.PRODUCTS, productId);
    if (!product) throw new Error('Product not found');
    
    const newStock = (product.stock || 0) + quantity;
    await updateDocument(COLLECTIONS.PRODUCTS, productId, {
      stock: Math.max(0, newStock),
      updated_at: serverTimestamp(),
    });
    
    console.log('✅ Product stock updated:', productId);
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

export default {
  fetchProducts,
  fetchProductById,
  fetchProductBySlug,
  fetchProductsByIds,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAllProducts,
  searchProducts,
  fetchTrendingProducts,
  fetchNewArrivals,
  updateProductStock,
};


/**
 * Get autocomplete suggestions for search
 * @param {string} searchQuery - Search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Promise<Array>} Autocomplete suggestions
 */
export async function getAutocompleteSuggestions(searchQuery, limit = 8) {
  if (!searchQuery || searchQuery.length < 1) return [];
  
  try {
    const query = searchQuery.toLowerCase().trim();
    
    // Get all products (with caching this should be fast)
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    const suggestions = [];
    const seen = new Set();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = data.name || '';
      const brand = data.brand || '';
      const category = data.category || '';
      const nameLower = name.toLowerCase();
      const brandLower = brand.toLowerCase();
      
      // Check if product name starts with query
      if (nameLower.startsWith(query)) {
        const key = `product:${name}`;
        if (!seen.has(key)) {
          suggestions.push({
            suggestion: name,
            match_type: 'product',
            category: category,
            priority: 1,
          });
          seen.add(key);
        }
      }
      // Check if product name contains query (lower priority)
      else if (nameLower.includes(query)) {
        const key = `product:${name}`;
        if (!seen.has(key)) {
          suggestions.push({
            suggestion: name,
            match_type: 'product',
            category: category,
            priority: 2,
          });
          seen.add(key);
        }
      }
      
      // Check if brand matches
      if (brandLower.startsWith(query)) {
        const key = `brand:${brand}`;
        if (!seen.has(key)) {
          suggestions.push({
            suggestion: brand,
            match_type: 'brand',
            category: 'Brand',
            priority: 1,
          });
          seen.add(key);
        }
      }
      
      // Check if category matches
      if (category.toLowerCase().startsWith(query)) {
        const key = `category:${category}`;
        if (!seen.has(key)) {
          suggestions.push({
            suggestion: category,
            match_type: 'category',
            category: 'Category',
            priority: 1,
          });
          seen.add(key);
        }
      }
    });
    
    // Sort by priority (starts with > contains) and then alphabetically
    suggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.suggestion.localeCompare(b.suggestion);
    });
    
    return suggestions.slice(0, limit);
  } catch (error) {
    console.error('Error getting autocomplete suggestions:', error);
    return [];
  }
}

/**
 * Get trending searches
 * @param {number} days - Number of days to look back
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Trending search terms
 */
export async function getTrendingSearches(days = 7, limit = 5) {
  // Return static trending searches for now
  // In production, this would come from analytics
  return [
    { search_term: 'T-Shirts', search_count: 245 },
    { search_term: 'Jeans', search_count: 189 },
    { search_term: 'Shirts', search_count: 156 },
    { search_term: 'Trousers', search_count: 134 },
    { search_term: 'Jackets', search_count: 98 },
  ].slice(0, limit);
}

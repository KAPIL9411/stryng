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
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} { products, pagination }
 */
export const fetchProducts = async (page = 1, pageSize = 24, filters = {}) => {
  try {
    const {
      category = [],
      sizes = [],
      colors = [],
      search = null,
      sort = 'recommended',
      minPrice = null,
      maxPrice = null,
    } = filters;

    console.log('🔍 Fetching products with filters:', { page, pageSize, filters });

    // Get all products first (Firestore has limitations with complex queries)
    const allProducts = await getDocuments(COLLECTIONS.PRODUCTS, {
      orderBy: [['created_at', 'desc']],
    });

    console.log('📦 Total products from DB:', allProducts.length);

    let filteredProducts = allProducts;

    // Apply category filter (array of categories)
    if (category && category.length > 0) {
      filteredProducts = filteredProducts.filter((p) =>
        category.includes(p.category)
      );
      console.log('📂 After category filter:', filteredProducts.length);
    }

    // Apply size filter (array of sizes)
    if (sizes && sizes.length > 0) {
      filteredProducts = filteredProducts.filter((p) =>
        p.sizes && p.sizes.some((size) => sizes.includes(size))
      );
      console.log('📏 After size filter:', filteredProducts.length);
    }

    // Apply color filter (array of colors)
    if (colors && colors.length > 0) {
      filteredProducts = filteredProducts.filter((p) =>
        p.colors && p.colors.some((color) => colors.includes(color.name))
      );
      console.log('🎨 After color filter:', filteredProducts.length);
    }

    // Apply price range filter
    if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
      const min = Number(minPrice);
      filteredProducts = filteredProducts.filter((p) => p.price >= min);
      console.log('💰 After min price filter:', filteredProducts.length);
    }
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
      const max = Number(maxPrice);
      filteredProducts = filteredProducts.filter((p) => p.price <= max);
      console.log('💰 After max price filter:', filteredProducts.length);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase().trim();
      // Normalize search term: remove hyphens, extra spaces for better matching
      const searchNormalized = searchLower.replace(/[-\s]+/g, '');
      console.log('🔎 Searching for:', searchLower, '| Normalized:', searchNormalized);
      
      filteredProducts = filteredProducts.filter((p) => {
        // Get product fields
        const name = p.name?.toLowerCase() || '';
        const desc = p.description?.toLowerCase() || '';
        const brand = p.brand?.toLowerCase() || '';
        const category = p.category?.toLowerCase() || '';
        
        // Normalize product fields for better matching
        const nameNormalized = name.replace(/[-\s]+/g, '');
        const categoryNormalized = category.replace(/[-\s]+/g, '');
        
        // Check both original and normalized versions
        const nameMatch = name.includes(searchLower) || nameNormalized.includes(searchNormalized);
        const descMatch = desc.includes(searchLower);
        const brandMatch = brand.includes(searchLower);
        const categoryMatch = category.includes(searchLower) || categoryNormalized.includes(searchNormalized);
        
        const matches = nameMatch || descMatch || brandMatch || categoryMatch;
        
        if (matches) {
          console.log('✅ Match found:', p.name, '| Category:', p.category);
        }
        
        return matches;
      });
      console.log('🔎 After search filter:', filteredProducts.length);
    }

    // Apply sorting
    switch (sort) {
      case 'price-low':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filteredProducts.sort((a, b) => {
          const aTime = a.created_at?.toMillis?.() || 0;
          const bTime = b.created_at?.toMillis?.() || 0;
          return bTime - aTime;
        });
        break;
      case 'popularity':
        filteredProducts.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
        break;
      default:
        // Recommended - keep current order
        break;
    }

    // Calculate pagination
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    console.log('📄 Pagination:', { page, totalPages, totalItems, returning: paginatedProducts.length });

    return {
      products: paginatedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
      },
    };
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return { 
      products: [], 
      pagination: { 
        currentPage: 1, 
        totalPages: 1, 
        totalItems: 0, 
        hasNext: false 
      } 
    };
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
    const searchNormalized = searchLower.replace(/[-\s]+/g, '');
    
    return allProducts
      .filter((p) => {
        const name = p.name?.toLowerCase() || '';
        const desc = p.description?.toLowerCase() || '';
        const brand = p.brand?.toLowerCase() || '';
        const category = p.category?.toLowerCase() || '';
        
        const nameNormalized = name.replace(/[-\s]+/g, '');
        const categoryNormalized = category.replace(/[-\s]+/g, '');
        
        return (
          name.includes(searchLower) ||
          nameNormalized.includes(searchNormalized) ||
          desc.includes(searchLower) ||
          brand.includes(searchLower) ||
          category.includes(searchLower) ||
          categoryNormalized.includes(searchNormalized)
        );
      })
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
    const queryNormalized = query.replace(/[-\s]+/g, '');
    
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
      const categoryLower = category.toLowerCase();
      
      // Normalize for better matching
      const nameNormalized = nameLower.replace(/[-\s]+/g, '');
      const categoryNormalized = categoryLower.replace(/[-\s]+/g, '');
      
      // Check if product name starts with query
      if (nameLower.startsWith(query) || nameNormalized.startsWith(queryNormalized)) {
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
      else if (nameLower.includes(query) || nameNormalized.includes(queryNormalized)) {
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
      if (categoryLower.startsWith(query) || categoryNormalized.startsWith(queryNormalized)) {
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

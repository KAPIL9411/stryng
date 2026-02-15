/**
 * Ultra-Fast React Query Hooks for Products
 * Optimized for maximum performance with in-memory caching
 * @module hooks/useProducts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import * as productsApi from '../api/products.api';
import useStore from '../store/useStore';

/**
 * Hook to fetch paginated products with ultra-fast caching
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Filter options
 * @param {Object} options - React Query options
 */
export const useProducts = (
  page = 1,
  limit = 24,
  filters = {},
  options = {}
) => {
  return useQuery({
    queryKey: ['products', page, filters],
    queryFn: () => productsApi.fetchProducts(page, limit, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};

/**
 * Hook to fetch single product by slug
 * @param {string} slug - Product slug
 */
export const useProduct = (slug, options = {}) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.fetchProductBySlug(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook to prefetch next page (background loading)
 */
export const usePrefetchProducts = () => {
  const queryClient = useQueryClient();

  return (page, limit, filters) => {
    queryClient.prefetchQuery({
      queryKey: ['products', page, filters],
      queryFn: () => productsApi.fetchProducts(page, limit, filters),
      staleTime: 5 * 60 * 1000,
    });
  };
};

/**
 * Hook to fetch products by IDs (for cart, wishlist)
 * @param {Array<string>} ids - Product IDs
 */
export const useProductsByIds = (ids, options = {}) => {
  return useQuery({
    queryKey: ['products-ids', ids?.sort().join(',')],
    queryFn: () => productsApi.fetchProductsByIds(ids),
    enabled: !!ids && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    ...options,
  });
};

/**
 * Hook to fetch trending products
 * @param {number} limit - Number of products
 */
export const useTrendingProducts = (limit = 12, options = {}) => {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: () => productsApi.fetchTrendingProducts(limit),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook to invalidate products cache
 */
export const useInvalidateProducts = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
    queryClient.invalidateQueries({ queryKey: ['trending'] });
    queryClient.invalidateQueries({ queryKey: ['products-all'] });
  };
};

/**
 * Hook to fetch all products (optimized)
 * WARNING: Use sparingly - prefer useProducts with pagination
 */
export const useAllProducts = (options = {}) => {
  return useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.fetchAllProducts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};

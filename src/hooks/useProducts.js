/**
 * React Query Hooks for Products
 * Provides caching, prefetching, and optimistic updates
 * @module hooks/useProducts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import * as productsApi from '../api/products.api';
import useStore from '../store/useStore';

/**
 * Hook to fetch paginated products with caching
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Filter options
 * @param {Object} options - React Query options
 */
export const useProducts = (page = 1, limit = 24, filters = {}, options = {}) => {
    return useQuery({
        queryKey: queryKeys.products.list(page, filters),
        queryFn: () => productsApi.fetchProducts(page, limit, filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        keepPreviousData: true,
        ...options,
    });
};

/**
 * Hook to fetch all products (legacy support)
 */
export const useAllProducts = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.products.all,
        queryFn: productsApi.fetchAllProducts,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        ...options,
    });
};

/**
 * Hook to fetch single product by slug
 * @param {string} slug - Product slug
 */
export const useProduct = (slug, options = {}) => {
    return useQuery({
        queryKey: queryKeys.products.detail(slug),
        queryFn: () => productsApi.fetchProductBySlug(slug),
        enabled: !!slug,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        ...options,
    });
};

/**
 * Hook to prefetch next page of products
 */
export const usePrefetchProducts = () => {
    const queryClient = useQueryClient();

    return (page, limit, filters) => {
        queryClient.prefetchQuery({
            queryKey: queryKeys.products.list(page, filters),
            queryFn: () => productsApi.fetchProducts(page, limit, filters),
        });
    };
};

/**
 * Hook to create/update/delete products (admin)
 */
export const useProductMutations = () => {
    const queryClient = useQueryClient();
    const { showToast } = useStore();

    const createMutation = useMutation({
        mutationFn: productsApi.createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
            showToast('Product created successfully', 'success');
        },
        onError: (error) => {
            console.error('Create product error:', error);
            showToast('Failed to create product', 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, productData }) => productsApi.updateProduct(id, productData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
            showToast('Product updated successfully', 'success');
        },
        onError: (error) => {
            console.error('Update product error:', error);
            showToast('Failed to update product', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: productsApi.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
            showToast('Product deleted successfully', 'success');
        },
        onError: (error) => {
            console.error('Delete product error:', error);
            showToast('Failed to delete product', 'error');
        },
    });

    return {
        createProduct: createMutation,
        updateProduct: updateMutation,
        deleteProduct: deleteMutation,
    };
};

/**
 * Hook to invalidate products cache (useful after updates)
 */
export const useInvalidateProducts = () => {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    };
};

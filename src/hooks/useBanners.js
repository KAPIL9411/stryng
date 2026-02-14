/**
 * React Query Hooks for Banners
 * Provides caching and mutations for banners
 * @module hooks/useBanners
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import * as bannersApi from '../api/banners.api';
import useStore from '../store/useStore';

/**
 * Hook to fetch active banners
 * Optimized for fast initial load
 */
export const useBanners = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.banners.active(),
        queryFn: bannersApi.fetchBanners,
        staleTime: 5 * 60 * 1000, // 5 minutes - reduced for fresher data
        cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
        refetchOnWindowFocus: false, // Don't refetch on focus for better performance
        refetchOnMount: false, // Don't refetch if data exists
        retry: 2, // Retry failed requests
        retryDelay: 1000, // Wait 1s between retries
        ...options,
    });
};

/**
 * Hook to create/update/delete banners (admin)
 */
export const useBannerMutations = () => {
    const queryClient = useQueryClient();
    const { showToast } = useStore();

    const createMutation = useMutation({
        mutationFn: bannersApi.createBanner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
            showToast('Banner created successfully', 'success');
        },
        onError: (error) => {
            console.error('Create banner error:', error);
            showToast('Failed to create banner', 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, bannerData }) => bannersApi.updateBanner(id, bannerData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
            showToast('Banner updated successfully', 'success');
        },
        onError: (error) => {
            console.error('Update banner error:', error);
            showToast('Failed to update banner', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: bannersApi.deleteBanner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
            showToast('Banner deleted successfully', 'success');
        },
        onError: (error) => {
            console.error('Delete banner error:', error);
            showToast('Failed to delete banner', 'error');
        },
    });

    return {
        createBanner: createMutation,
        updateBanner: updateMutation,
        deleteBanner: deleteMutation,
    };
};

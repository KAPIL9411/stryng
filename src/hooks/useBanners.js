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
 */
export const useBanners = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.banners.active(),
        queryFn: bannersApi.fetchBanners,
        staleTime: 10 * 60 * 1000, // 10 minutes
        cacheTime: 15 * 60 * 1000, // 15 minutes
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

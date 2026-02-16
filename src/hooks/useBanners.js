/**
 * React Query Hooks for Banners
 * Provides caching and mutations for banners with instant loading
 * @module hooks/useBanners
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import * as bannersApi from '../api/banners.api';
import useStore from '../store/useStore';

/**
 * Hook to fetch active banners with instant loading
 * Uses multi-layer cache for zero loading time
 */
export const useBanners = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.banners.active(),
    queryFn: bannersApi.fetchBanners,
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    cacheTime: 60 * 60 * 1000, // 60 minutes - keep in React Query cache
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnReconnect: true, // Refetch when internet reconnects
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1s between retries
    // Enable background refetching for fresh data
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes in background
    // Optimistic updates - show cached data immediately
    placeholderData: (previousData) => previousData,
    ...options,
  });
};

/**
 * Hook to create/update/delete banners (admin)
 * Automatically clears cache on mutations
 */
export const useBannerMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useStore();

  const createMutation = useMutation({
    mutationFn: bannersApi.createBanner,
    onSuccess: () => {
      // Invalidate React Query cache
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
      // Invalidate React Query cache
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
      // Invalidate React Query cache
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

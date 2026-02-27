/**
 * React Query Hook for Banners
 * Optimized for instant loading with placeholderData
 */

import { useQuery } from '@tanstack/react-query';
import { fetchActiveBanners } from '../api/banners.api';

/**
 * Hook to fetch active banners
 * Uses placeholderData for instant display while fetching fresh data
 */
export const useBanners = () => {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: fetchActiveBanners,
    staleTime: 30 * 1000, // 30 seconds - data is fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 3,
    retryDelay: 1000,
    // Show cached data immediately while fetching in background
    placeholderData: (previousData) => previousData,
    // Keep previous data while fetching new data
    keepPreviousData: true,
  });
};


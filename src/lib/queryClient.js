/**
 * React Query Configuration
 * Provides caching, background refetching, and optimistic updates
 */

import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
            
            // Keep unused data in cache for 10 minutes
            cacheTime: 10 * 60 * 1000,
            
            // Retry failed requests 2 times
            retry: 2,
            
            // Retry delay increases exponentially
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            
            // Refetch on window focus (user comes back to tab)
            refetchOnWindowFocus: true,
            
            // Refetch on reconnect (internet comes back)
            refetchOnReconnect: true,
            
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            
            // Keep previous data while fetching new data
            keepPreviousData: true,
            
            // Suspense mode disabled by default
            suspense: false,
        },
        mutations: {
            // Retry mutations once
            retry: 1,
            
            // Retry delay for mutations
            retryDelay: 1000,
        },
    },
});

// Query keys factory for consistent cache keys
export const queryKeys = {
    // Products
    products: {
        all: ['products'],
        lists: () => [...queryKeys.products.all, 'list'],
        list: (page, filters) => [...queryKeys.products.lists(), { page, filters }],
        details: () => [...queryKeys.products.all, 'detail'],
        detail: (slug) => [...queryKeys.products.details(), slug],
    },
    
    // Banners
    banners: {
        all: ['banners'],
        active: () => [...queryKeys.banners.all, 'active'],
    },
    
    // Orders
    orders: {
        all: ['orders'],
        lists: () => [...queryKeys.orders.all, 'list'],
        list: (userId) => [...queryKeys.orders.lists(), userId],
        details: () => [...queryKeys.orders.all, 'detail'],
        detail: (orderId) => [...queryKeys.orders.details(), orderId],
    },
    
    // User
    user: {
        all: ['user'],
        profile: () => [...queryKeys.user.all, 'profile'],
    },
};

// Prefetch utilities
export const prefetchProducts = async (page, filters) => {
    await queryClient.prefetchQuery({
        queryKey: queryKeys.products.list(page, filters),
        queryFn: () => fetchProductsForQuery(page, filters),
    });
};

export const prefetchProductDetail = async (slug) => {
    await queryClient.prefetchQuery({
        queryKey: queryKeys.products.detail(slug),
        queryFn: () => fetchProductDetailForQuery(slug),
    });
};

// Helper functions (to be implemented with actual API calls)
const fetchProductsForQuery = async (page, filters) => {
    // This will be implemented in the hook
    return { products: [], pagination: {} };
};

const fetchProductDetailForQuery = async (slug) => {
    // This will be implemented in the hook
    return {};
};

export default queryClient;

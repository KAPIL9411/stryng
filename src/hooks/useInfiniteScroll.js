import { useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll Hook
 * Detects when user scrolls near the bottom and triggers a callback
 * Uses Intersection Observer for efficient scroll detection
 * 
 * @param {Function} callback - Function to call when user reaches bottom
 * @param {boolean} hasMore - Whether there's more content to load
 * @param {boolean} isLoading - Whether content is currently loading
 * @param {Object} options - Intersection Observer options
 * @returns {Object} { ref, isIntersecting }
 */
export const useInfiniteScroll = (callback, hasMore, isLoading, options = {}) => {
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    const {
        threshold = 0.5,
        rootMargin = '100px', // Start loading 100px before reaching the element
    } = options;

    const handleObserver = useCallback((entries) => {
        const [entry] = entries;
        
        if (entry.isIntersecting && hasMore && !isLoading) {
            callback();
        }
    }, [callback, hasMore, isLoading]);

    useEffect(() => {
        // Create observer
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(handleObserver, {
            threshold,
            rootMargin,
        });

        // Observe the load more element
        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observerRef.current.observe(currentRef);
        }

        // Cleanup
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleObserver, threshold, rootMargin]);

    return { ref: loadMoreRef };
};

export default useInfiniteScroll;

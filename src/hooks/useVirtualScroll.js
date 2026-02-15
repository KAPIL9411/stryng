import { useState, useCallback, useMemo } from 'react';

/**
 * useVirtualScroll Hook
 * Implements virtual scrolling to render only visible items in long lists
 * Improves performance by reducing DOM nodes for large datasets
 *
 * @param {Array} items - Full array of items to virtualize
 * @param {Object} config - Configuration object
 * @param {number} config.itemHeight - Fixed height per item in pixels
 * @param {number} config.containerHeight - Viewport height in pixels
 * @param {number} config.overscan - Extra items to render above/below viewport (default: 3)
 * @returns {Object} { visibleItems, scrollOffset, totalHeight, containerProps, onScroll }
 */
export function useVirtualScroll(items, config) {
  const {
    itemHeight,
    containerHeight,
    overscan = 3, // Render 3 extra items above and below for smooth scrolling
  } = config;

  const [scrollTop, setScrollTop] = useState(0);

  // Calculate total height of all items
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Calculate which items should be visible
  const { visibleItems, startIndex, offsetY } = useMemo(() => {
    // Calculate the range of visible items
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIdx = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    // Get the visible items
    const visible = items.slice(startIdx, endIdx + 1);

    // Calculate the offset for positioning
    const offset = startIdx * itemHeight;

    return {
      visibleItems: visible,
      startIndex: startIdx,
      offsetY: offset,
    };
  }, [scrollTop, items, itemHeight, containerHeight, overscan]);

  // Handle scroll events
  const handleScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    setScrollTop(scrollTop);
  }, []);

  // Props to spread on the scrollable container
  const containerProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto',
      position: 'relative',
    },
  };

  return {
    visibleItems,
    startIndex,
    scrollOffset: offsetY,
    totalHeight,
    containerProps,
    onScroll: handleScroll,
  };
}

export default useVirtualScroll;

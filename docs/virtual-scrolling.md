# Virtual Scrolling Implementation

## Overview

Virtual scrolling has been implemented for the ProductListing page to improve performance when displaying large lists of products. This technique renders only the visible items in the viewport plus a small overscan buffer, significantly reducing DOM nodes and improving rendering performance.

## Implementation Details

### useVirtualScroll Hook

Location: `src/hooks/useVirtualScroll.js`

The `useVirtualScroll` hook provides virtual scrolling functionality with the following features:

**Parameters:**
- `items` (Array): Full array of items to virtualize
- `config` (Object):
  - `itemHeight` (number): Fixed height per item in pixels
  - `containerHeight` (number): Viewport height in pixels
  - `overscan` (number): Extra items to render above/below viewport (default: 3)

**Returns:**
- `visibleItems`: Array of items currently visible in viewport
- `startIndex`: Index of first visible item
- `scrollOffset`: Y-offset for positioning visible items
- `totalHeight`: Total height of all items combined
- `containerProps`: Props to spread on scrollable container
- `onScroll`: Scroll event handler

**Example Usage:**
```javascript
const { visibleItems, scrollOffset, totalHeight, containerProps } = useVirtualScroll(
  products,
  {
    itemHeight: 520,
    containerHeight: 800,
    overscan: 2,
  }
);
```

### ProductListing Integration

Location: `src/pages/ProductListing.jsx`

Virtual scrolling is applied to the ProductListing page with the following configuration:

**Configuration:**
```javascript
const VIRTUAL_SCROLL_CONFIG = {
  itemHeight: 520,      // Product card height (400px image + 120px info)
  containerHeight: 800, // Initial viewport height
  overscan: 2,          // Render 2 extra items for smooth scrolling
};
```

**Features:**
- Automatically enabled for lists with more than 20 products
- Responsive container height based on viewport size
- Grid layout support (3 columns)
- Maintains pagination functionality
- Smooth scrolling with overscan buffer

**VirtualProductGrid Component:**
The `VirtualProductGrid` component wraps the product grid and handles:
- Dynamic container height calculation
- Row-based virtualization for grid layouts
- Proper positioning of visible items
- Loading state opacity transitions

## Performance Benefits

### Before Virtual Scrolling
- All products rendered in DOM (e.g., 100 products = 100 DOM nodes)
- Slower initial render and scroll performance
- Higher memory usage

### After Virtual Scrolling
- Only visible products rendered (e.g., ~10-15 visible products)
- Faster initial render and smooth scrolling
- Reduced memory footprint
- Better performance on mobile devices

## Configuration

Virtual scrolling can be toggled using the `USE_VIRTUAL_SCROLL` constant in `ProductListing.jsx`:

```javascript
const USE_VIRTUAL_SCROLL = true; // Enable virtual scrolling
```

The feature automatically activates when:
- `USE_VIRTUAL_SCROLL` is `true`
- Product list has more than 20 items

## Technical Details

### How It Works

1. **Calculate Visible Range:**
   - Determines which items are in viewport based on scroll position
   - Adds overscan items above and below for smooth scrolling

2. **Render Only Visible Items:**
   - Slices the full item array to get visible subset
   - Renders only these items in the DOM

3. **Position with Transform:**
   - Uses CSS `transform: translateY()` for positioning
   - Creates spacer div with total height for scrollbar

4. **Handle Scroll Events:**
   - Updates scroll position on scroll
   - Recalculates visible items
   - Efficient updates using React hooks

### Grid Layout Handling

For grid layouts, products are organized into rows:
```javascript
const itemsPerRow = 3;
const productRows = useMemo(() => {
  const rows = [];
  for (let i = 0; i < products.length; i += itemsPerRow) {
    rows.push(products.slice(i, i + itemsPerRow));
  }
  return rows;
}, [products]);
```

This ensures proper grid rendering while maintaining virtual scrolling benefits.

## Testing

Unit tests are provided in `src/hooks/useVirtualScroll.test.js` covering:
- Initialization with correct values
- Total height calculation
- Visible items calculation with overscan
- Scroll event handling
- Edge cases (empty arrays, small lists)
- Container props generation
- Boundary conditions

## Browser Compatibility

Virtual scrolling works in all modern browsers that support:
- CSS transforms
- React hooks
- Scroll events

No special polyfills required.

## Future Enhancements

Potential improvements:
1. Dynamic item heights (currently requires fixed height)
2. Horizontal virtual scrolling support
3. Variable overscan based on scroll velocity
4. Intersection Observer integration for better performance
5. Support for different grid column counts

## Related Files

- `src/hooks/useVirtualScroll.js` - Main hook implementation
- `src/hooks/useVirtualScroll.test.js` - Unit tests
- `src/pages/ProductListing.jsx` - ProductListing page with virtual scrolling
- `docs/virtual-scrolling.md` - This documentation

## Requirements Validation

This implementation validates **Requirement 3.7**:
> WHEN long lists are rendered, THE Platform SHALL use virtual scrolling to render only visible items

**Property 8: Virtual scrolling for long lists**
> For any list with more than 50 items, only the visible items plus a small overscan buffer should be rendered in the DOM

The implementation ensures that only visible items (plus overscan) are rendered, significantly improving performance for large product lists.

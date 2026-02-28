import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Heart,
  Eye,
  ShoppingBag,
  ChevronDown,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { CATEGORIES } from '../utils/constants';
import useStore from '../store/useStore';
import SEO from '../components/SEO';
import { trackSearch } from '../lib/analytics';
import { getProductCardImageProps } from '../lib/imageOptimization';
import ProductSkeleton from '../components/ui/ProductSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import useDebounce from '../hooks/useDebounce';
import { useProducts, usePrefetchProducts } from '../hooks/useProducts';
import { PRODUCTS_PER_PAGE } from '../config/constants';
import { getStockStatus } from '../lib/inventory';
import { useVirtualScroll } from '../hooks/useVirtualScroll';

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colorOptions = [
  { name: 'Black', hex: '#0A0A0A' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Green', hex: '#1B4332' },
  { name: 'Blue', hex: '#4A90D9' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Gray', hex: '#808080' },
];

function ProductCard({ product, priority = false }) {
  const { isInWishlist, toggleWishlist } = useStore();
  const isWishlisted = isInWishlist(product.id);

  // Safety check for images
  const images = product.images || [];
  const hasImages = images.length > 0;

  // Get optimized image props
  const imageProps = hasImages ? getProductCardImageProps(images[0]) : null;

  // Get stock status
  const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
  const isOutOfStock = product.stock !== undefined && product.stock === 0;

  // Handle both snake_case and camelCase field names
  const originalPrice = product.originalPrice || product.original_price || 0;
  const currentPrice = product.price || 0;
  const discount = product.discount || product.discount_percentage || 0;

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="myntra-product-card"
      style={{ opacity: isOutOfStock ? 0.7 : 1 }}
    >
      <div className="myntra-product-card__image-wrapper">
        {hasImages && imageProps ? (
          <>
            <img
              {...imageProps}
              alt={product.name}
              className="myntra-product-card__image"
              loading={priority ? 'eager' : imageProps.loading}
              fetchPriority={priority ? 'high' : 'auto'}
              width="400"
              height="500"
              style={{ filter: isOutOfStock ? 'grayscale(50%)' : 'none' }}
            />
          </>
        ) : (
          <div 
            className="myntra-product-card__image" 
            style={{ 
              backgroundColor: '#f3f4f6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '500px'
            }}
          >
            <span style={{ color: '#9ca3af' }}>No Image</span>
          </div>
        )}
        
        <button
          className={`myntra-product-card__wishlist ${isWishlisted ? 'active' : ''}`}
          aria-label={
            isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'
          }
          onClick={handleWishlistClick}
        >
          <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
        
        <div className="myntra-product-card__badges">
          {isOutOfStock && (
            <span
              className="myntra-badge myntra-badge--out-of-stock"
              role="status"
              aria-label="Out of stock"
            >
              Out of Stock
            </span>
          )}
          {!isOutOfStock && stockStatus.status === 'critical_low' && (
            <span
              className="myntra-badge myntra-badge--discount"
              role="status"
              aria-label={stockStatus.label}
            >
              {stockStatus.label}
            </span>
          )}
          {!isOutOfStock && product.isNew && (
            <span
              className="myntra-badge myntra-badge--new"
              role="status"
              aria-label="New arrival"
            >
              New
            </span>
          )}
          {!isOutOfStock && product.isTrending && (
            <span
              className="myntra-badge myntra-badge--trending"
              role="status"
              aria-label="Trending product"
            >
              Trending
            </span>
          )}
          {!isOutOfStock && discount > 0 && (
            <span
              className="myntra-badge myntra-badge--discount"
              role="status"
              aria-label={`${discount}% discount`}
            >
              {discount}% OFF
            </span>
          )}
        </div>
      </div>
      
      <div className="myntra-product-card__info">
        <p className="myntra-product-card__brand">{product.brand}</p>
        <h3 className="myntra-product-card__name">{product.name}</h3>
        <div className="myntra-product-card__price">
          <span className="myntra-product-card__price-current">
            {formatPrice(currentPrice)}
          </span>
          {originalPrice && originalPrice > currentPrice && (
            <>
              <span className="myntra-product-card__price-original">
                {formatPrice(originalPrice)}
              </span>
              <span className="myntra-product-card__price-discount">
                {discount}% OFF
              </span>
            </>
          )}
        </div>
        {product.rating && product.rating > 0 && (
          <div className="myntra-product-card__rating">
            <span className="myntra-product-card__rating-value">
              {product.rating} ★
            </span>
            {product.reviewCount && product.reviewCount > 0 && (
              <span className="myntra-product-card__rating-count">
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

const FilterSidebar = memo(function FilterSidebar({ 
  openSections,
  toggle,
  currentCategories,
  currentSizes,
  currentColors,
  minPrice,
  maxPrice,
  updateFilter,
  updatePrice,
  clearAllFilters,
  hasActiveFilters
}) {
  return (
    <aside className="myntra-filters">
      <div className="myntra-filters__header">
        <h3 className="myntra-filters__title">Filters</h3>
        {hasActiveFilters && (
          <button
            className="myntra-filters__clear"
            onClick={clearAllFilters}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div className="myntra-filter-section">
        <div 
          className="myntra-filter-section__header"
          onClick={() => toggle('category')}
        >
          <h4 className="myntra-filter-section__title">Category</h4>
          <ChevronDown 
            size={18} 
            className={`myntra-filter-section__toggle ${openSections.category ? 'open' : ''}`}
          />
        </div>
        <div className={`myntra-filter-section__content ${openSections.category ? 'open' : ''}`}>
          <div className="myntra-checkbox-group">
            {CATEGORIES.map((cat) => (
              <label key={cat.id} className="myntra-checkbox">
                <input
                  type="checkbox"
                  checked={currentCategories.includes(cat.slug)}
                  onChange={() => updateFilter('category', cat.slug)}
                />
                <span className="myntra-checkbox__label">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="myntra-filter-section">
        <div 
          className="myntra-filter-section__header"
          onClick={() => toggle('price')}
        >
          <h4 className="myntra-filter-section__title">Price Range</h4>
          <ChevronDown 
            size={18} 
            className={`myntra-filter-section__toggle ${openSections.price ? 'open' : ''}`}
          />
        </div>
        <div className={`myntra-filter-section__content ${openSections.price ? 'open' : ''}`}>
          <div className="myntra-price-range">
            <div className="myntra-price-range__inputs">
              <input
                type="number"
                className="myntra-price-range__input"
                placeholder="₹ Min"
                value={minPrice}
                onChange={(e) => updatePrice('minPrice', e.target.value)}
                min="0"
              />
              <span className="myntra-price-range__separator">—</span>
              <input
                type="number"
                className="myntra-price-range__input"
                placeholder="₹ Max"
                value={maxPrice}
                onChange={(e) => updatePrice('maxPrice', e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="myntra-filter-section">
        <div 
          className="myntra-filter-section__header"
          onClick={() => toggle('size')}
        >
          <h4 className="myntra-filter-section__title">Size</h4>
          <ChevronDown 
            size={18} 
            className={`myntra-filter-section__toggle ${openSections.size ? 'open' : ''}`}
          />
        </div>
        <div className={`myntra-filter-section__content ${openSections.size ? 'open' : ''}`}>
          <div className="myntra-checkbox-group">
            {sizes.map((s) => (
              <label key={s} className="myntra-checkbox">
                <input
                  type="checkbox"
                  checked={currentSizes.includes(s)}
                  onChange={() => updateFilter('size', s)}
                />
                <span className="myntra-checkbox__label">{s}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="myntra-filter-section">
        <div 
          className="myntra-filter-section__header"
          onClick={() => toggle('color')}
        >
          <h4 className="myntra-filter-section__title">Color</h4>
          <ChevronDown 
            size={18} 
            className={`myntra-filter-section__toggle ${openSections.color ? 'open' : ''}`}
          />
        </div>
        <div className={`myntra-filter-section__content ${openSections.color ? 'open' : ''}`}>
          <div className="myntra-color-swatches">
            {colorOptions.map((c) => (
              <button
                key={c.name}
                className={`myntra-color-swatch ${currentColors.includes(c.name) ? 'selected' : ''}`}
                style={{
                  backgroundColor: c.hex,
                }}
                title={c.name}
                aria-label={c.name}
                onClick={() => updateFilter('color', c.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
});

FilterSidebar.displayName = 'FilterSidebar';

const USE_INFINITE_SCROLL = false; // Disabled for now, use traditional pagination
const USE_VIRTUAL_SCROLL = true; // Enable virtual scrolling for better performance

// Virtual scrolling configuration
const VIRTUAL_SCROLL_CONFIG = {
  itemHeight: 520, // Approximate height of product card (400px image + 120px info)
  containerHeight: 800, // Viewport height for virtual scroll container
  overscan: 2, // Render 2 extra items above/below for smooth scrolling
};

/**
 * VirtualProductGrid Component
 * Renders product grid with virtual scrolling for improved performance
 * Memoized to prevent unnecessary re-renders
 */
const VirtualProductGrid = memo(function VirtualProductGrid({ products, isFetching }) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(VIRTUAL_SCROLL_CONFIG.containerHeight);

  // Update container height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      // Use viewport height minus header and other UI elements
      const availableHeight = window.innerHeight - 300; // 300px for header, filters, etc.
      setContainerHeight(Math.max(600, availableHeight));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Calculate items per row based on grid layout
  const itemsPerRow = 3; // Default grid has 3 columns
  const rowHeight = VIRTUAL_SCROLL_CONFIG.itemHeight;

  // Convert flat product list to rows for virtual scrolling - memoized
  const productRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < products.length; i += itemsPerRow) {
      rows.push(products.slice(i, i + itemsPerRow));
    }
    return rows;
  }, [products]);

  // Use virtual scroll hook
  const { visibleItems, scrollOffset, totalHeight, containerProps } = useVirtualScroll(
    productRows,
    {
      itemHeight: rowHeight,
      containerHeight,
      overscan: VIRTUAL_SCROLL_CONFIG.overscan,
    }
  );

  // Memoize container style
  const containerStyle = useMemo(() => ({
    ...containerProps.style,
    opacity: isFetching ? 0.6 : 1,
    transition: 'opacity 0.2s',
  }), [containerProps.style, isFetching]);

  // Memoize visible items style
  const visibleItemsStyle = useMemo(() => ({
    transform: `translateY(${scrollOffset}px)`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  }), [scrollOffset]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      style={containerStyle}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div style={visibleItemsStyle}>
          {visibleItems.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="product-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 'var(--space-6)',
                marginBottom: 'var(--space-6)',
              }}
            >
              {row.map((product, colIndex) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={rowIndex === 0 && colIndex < 3}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualProductGrid.displayName = 'VirtualProductGrid';

export default function ProductListing() {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [openSections, setOpenSections] = useState({
    category: true,
    price: true,
    size: true,
    color: true,
  });

  const currentPage = Number(searchParams.get('page')) || 1;
  const rawSearchQuery = searchParams.get('search')?.trim() || '';

  // Get current filters
  const currentCategories = searchParams.getAll('category');
  const currentSizes = searchParams.getAll('size');
  const currentColors = searchParams.getAll('color');
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  // Memoize toggle function
  const toggle = useCallback((section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Memoize filter update function
  const updateFilter = useCallback((type, value) => {
    const newParams = new URLSearchParams(searchParams);
    const current = newParams.getAll(type);

    if (current.includes(value)) {
      newParams.delete(type);
      current
        .filter((item) => item !== value)
        .forEach((val) => newParams.append(type, val));
    } else {
      newParams.append(type, value);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Memoize price update function
  const updatePrice = useCallback((type, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(type, value);
    } else {
      newParams.delete(type);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Memoize clear all function
  const clearAllFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters = currentCategories.length > 0 ||
    currentSizes.length > 0 ||
    currentColors.length > 0 ||
    minPrice ||
    maxPrice;

  // Debounce search query to reduce API calls
  const searchQuery = useDebounce(rawSearchQuery, 300);

  // Build filters object from URL params
  const filters = useMemo(() => {
    const selectedCategories = searchParams.getAll('category');
    const selectedSizes = searchParams.getAll('size');
    const selectedColors = searchParams.getAll('color');
    const minPrice = Number(searchParams.get('minPrice')) || undefined;
    const maxPrice = Number(searchParams.get('maxPrice')) || undefined;
    const sortOption = searchParams.get('sort') || 'recommended';

    return {
      category: selectedCategories,
      sizes: selectedSizes,
      colors: selectedColors,
      minPrice,
      maxPrice,
      search: searchQuery,
      sort: sortOption,
    };
  }, [searchParams, searchQuery]);

  // Fetch products using React Query
  const { data, isLoading, isFetching, isError, error, refetch } = useProducts(
    currentPage,
    PRODUCTS_PER_PAGE,
    filters
  );

  // Debug: Log query state
  useEffect(() => {
    console.log('📊 Query State:', {
      isLoading,
      isFetching,
      isError,
      hasData: !!data,
      productsCount: data?.products?.length,
      error: error?.message,
    });
  }, [isLoading, isFetching, isError, data, error]);

  // Prefetch next page
  const prefetchProducts = usePrefetchProducts();

  useEffect(() => {
    if (data?.pagination?.hasNext && !isFetching) {
      prefetchProducts(currentPage + 1, PRODUCTS_PER_PAGE, filters);
    }
  }, [currentPage, filters, data, isFetching, prefetchProducts]);

  // Track search queries
  useEffect(() => {
    if (searchQuery && data) {
      trackSearch(searchQuery, data.pagination.totalItems);
    }
  }, [searchQuery, data]);

  // Extract data
  const products = data?.products || [];
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
  };

  const handleSortChange = (e) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', e.target.value);
    newParams.set('page', '1'); // Reset to page 1 when sorting changes
    setSearchParams(newParams);
  };

  const handlePageChange = (page) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate SEO title and description based on filters
  const selectedCategory = searchParams.get('category');

  let seoTitle = 'Shop All Products - Stryng Clothing';
  let seoDescription =
    'Browse our complete collection of premium streetwear, t-shirts, shirts, and trousers.';

  if (searchQuery) {
    seoTitle = `Search Results for "${searchQuery}" - Stryng Clothing`;
    seoDescription = `Found ${pagination.totalItems} products matching "${searchQuery}". Shop premium streetwear and fashion.`;
  } else if (selectedCategory) {
    const categoryName =
      CATEGORIES.find((c) => c.slug === selectedCategory)?.name ||
      selectedCategory;
    seoTitle = `${categoryName} - Stryng Clothing`;
    seoDescription = `Shop ${categoryName.toLowerCase()} from Stryng Clothing. Premium quality with direct-to-consumer pricing.`;
  }

  return (
    <div className="myntra-products-page">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={`${selectedCategory || 'clothing'}, streetwear, fashion, online shopping, India`}
      />
      
      {/* Breadcrumb */}
      <div className="myntra-breadcrumb">
        <div className="myntra-breadcrumb__container">
          <Link to="/" className="myntra-breadcrumb__link">
            Home
          </Link>
          <span>/</span>
          <span className="myntra-breadcrumb__current">All Products</span>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <button
        className="filter-toggle"
        onClick={() => setMobileFilterOpen(true)}
        style={{ 
          display: 'none',
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          padding: '12px 24px',
          background: 'var(--myntra-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          boxShadow: 'var(--myntra-shadow-lg)',
          fontSize: 'var(--myntra-font-size-base)',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        <SlidersHorizontal size={16} /> Filters{' '}
        {searchParams.toString() && products.length !== pagination.totalItems
          ? '(Active)'
          : ''}
      </button>

      <div className="myntra-products-layout">
        <FilterSidebar 
          openSections={openSections}
          toggle={toggle}
          currentCategories={currentCategories}
          currentSizes={currentSizes}
          currentColors={currentColors}
          minPrice={minPrice}
          maxPrice={maxPrice}
          updateFilter={updateFilter}
          updatePrice={updatePrice}
          clearAllFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="myntra-products-area">
          <div className="myntra-products-topbar">
            <div className="myntra-products-topbar__info">
              <strong>{pagination.totalItems}</strong> Product
              {pagination.totalItems !== 1 ? 's' : ''}
              {searchParams.get('search') &&
                ` for "${searchParams.get('search')}"`}
            </div>
            <div className="myntra-products-topbar__actions">
              <div className="myntra-sort-dropdown">
                <select
                  className="myntra-sort-dropdown__button"
                  value={searchParams.get('sort') || 'recommended'}
                  onChange={handleSortChange}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    paddingRight: '32px',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23282C3F\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center'
                  }}
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading && !data ? (
            <div className="myntra-products-grid">
              <ProductSkeleton count={12} />
            </div>
          ) : isError ? (
            <div
              style={{
                padding: '60px 0',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              <ErrorMessage
                title="Error loading products"
                message={
                  error?.message || 'Something went wrong. Please try again.'
                }
                onRetry={() => refetch()}
              />
            </div>
          ) : products.length > 0 ? (
            <>
              {isFetching && (
                <div
                  style={{
                    position: 'fixed',
                    top: '80px',
                    right: '20px',
                    background: 'var(--myntra-primary)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  Loading...
                </div>
              )}
              
              {/* Use virtual scrolling for better performance with large lists */}
              {USE_VIRTUAL_SCROLL && products.length > 20 ? (
                <VirtualProductGrid products={products} isFetching={isFetching} />
              ) : (
                <div
                  className="myntra-products-grid"
                  style={{
                    opacity: isFetching ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {products.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={index < 6}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination" style={{ padding: 'var(--myntra-space-6)' }}>
                  <button
                    className="pagination__btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isFetching}
                    aria-label="Previous page"
                  >
                    &laquo;
                  </button>

                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  ).map((page) => {
                    const showPage =
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!showPage) {
                      if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="pagination__ellipsis">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        className={`pagination__btn ${page === currentPage ? 'pagination__btn--active' : ''}`}
                        onClick={() => handlePageChange(page)}
                        disabled={isFetching}
                        aria-label={`Page ${page}`}
                        aria-current={
                          page === currentPage ? 'page' : undefined
                        }
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    className="pagination__btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={
                      currentPage === pagination.totalPages || isFetching
                    }
                    aria-label="Next page"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-products-state" style={{ padding: 'var(--myntra-space-8)' }}>
              <div className="empty-products-state__icon">
                <ShoppingBag size={64} strokeWidth={1.5} />
              </div>
              <h2 className="empty-products-state__title">No Products Found</h2>
              <p className="empty-products-state__message">
                Try adjusting your filters or search criteria.
              </p>
              <button
                className="btn btn--primary empty-products-state__button"
                onClick={() => setSearchParams({})}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Filter Overlay */}
      {mobileFilterOpen && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div
            className="myntra-filters open"
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div className="myntra-filters__header">
              <h3 className="myntra-filters__title">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--myntra-space-2)',
                  color: 'var(--myntra-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--myntra-bg-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Category */}
            <div className="myntra-filter-section">
              <div 
                className="myntra-filter-section__header"
                onClick={() => toggle('category')}
              >
                <h4 className="myntra-filter-section__title">Category</h4>
                <ChevronDown 
                  size={18} 
                  className={`myntra-filter-section__toggle ${openSections.category ? 'open' : ''}`}
                />
              </div>
              <div className={`myntra-filter-section__content ${openSections.category ? 'open' : ''}`}>
                <div className="myntra-checkbox-group">
                  {CATEGORIES.map((cat) => (
                    <label key={cat.id} className="myntra-checkbox">
                      <input
                        type="checkbox"
                        checked={currentCategories.includes(cat.slug)}
                        onChange={() => updateFilter('category', cat.slug)}
                      />
                      <span className="myntra-checkbox__label">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="myntra-filter-section">
              <div 
                className="myntra-filter-section__header"
                onClick={() => toggle('price')}
              >
                <h4 className="myntra-filter-section__title">Price Range</h4>
                <ChevronDown 
                  size={18} 
                  className={`myntra-filter-section__toggle ${openSections.price ? 'open' : ''}`}
                />
              </div>
              <div className={`myntra-filter-section__content ${openSections.price ? 'open' : ''}`}>
                <div className="myntra-price-range">
                  <div className="myntra-price-range__inputs">
                    <input
                      type="number"
                      className="myntra-price-range__input"
                      placeholder="₹ Min"
                      value={minPrice}
                      onChange={(e) => updatePrice('minPrice', e.target.value)}
                      min="0"
                    />
                    <span className="myntra-price-range__separator">—</span>
                    <input
                      type="number"
                      className="myntra-price-range__input"
                      placeholder="₹ Max"
                      value={maxPrice}
                      onChange={(e) => updatePrice('maxPrice', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="myntra-filter-section">
              <div 
                className="myntra-filter-section__header"
                onClick={() => toggle('size')}
              >
                <h4 className="myntra-filter-section__title">Size</h4>
                <ChevronDown 
                  size={18} 
                  className={`myntra-filter-section__toggle ${openSections.size ? 'open' : ''}`}
                />
              </div>
              <div className={`myntra-filter-section__content ${openSections.size ? 'open' : ''}`}>
                <div className="myntra-checkbox-group">
                  {sizes.map((s) => (
                    <label key={s} className="myntra-checkbox">
                      <input
                        type="checkbox"
                        checked={currentSizes.includes(s)}
                        onChange={() => updateFilter('size', s)}
                      />
                      <span className="myntra-checkbox__label">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="myntra-filter-section">
              <div 
                className="myntra-filter-section__header"
                onClick={() => toggle('color')}
              >
                <h4 className="myntra-filter-section__title">Color</h4>
                <ChevronDown 
                  size={18} 
                  className={`myntra-filter-section__toggle ${openSections.color ? 'open' : ''}`}
                />
              </div>
              <div className={`myntra-filter-section__content ${openSections.color ? 'open' : ''}`}>
                <div className="myntra-color-swatches">
                  {colorOptions.map((c) => (
                    <button
                      key={c.name}
                      className={`myntra-color-swatch ${currentColors.includes(c.name) ? 'selected' : ''}`}
                      style={{
                        backgroundColor: c.hex,
                      }}
                      title={c.name}
                      aria-label={c.name}
                      onClick={() => updateFilter('color', c.name)}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {hasActiveFilters && (
              <div style={{ padding: 'var(--myntra-space-4)', borderTop: '1px solid var(--myntra-border)' }}>
                <button
                  className="myntra-filters__clear"
                  onClick={clearAllFilters}
                  style={{ width: '100%' }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

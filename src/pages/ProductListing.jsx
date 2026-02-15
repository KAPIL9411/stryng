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
  const { isInWishlist } = useStore();
  const isWishlisted = isInWishlist(product.id);

  // Safety check for images
  const images = product.images || [];
  const hasImages = images.length > 0;

  // Get optimized image props
  const imageProps = hasImages ? getProductCardImageProps(images[0]) : null;

  // Get stock status
  const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
  const isOutOfStock = product.stock !== undefined && product.stock === 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="product-card"
      style={{ opacity: isOutOfStock ? 0.7 : 1 }}
    >
      <div className="product-card__image-wrapper">
        {hasImages && imageProps ? (
          <>
            <img
              {...imageProps}
              alt={product.name}
              className="product-card__image"
              loading={priority ? 'eager' : imageProps.loading}
              fetchPriority={priority ? 'high' : 'auto'}
              width="400"
              height="500"
              style={{ filter: isOutOfStock ? 'grayscale(50%)' : 'none' }}
            />
            {images[1] && (
              <img
                src={images[1]}
                alt={`${product.name} alternate view`}
                className="product-card__hover-image"
                loading="lazy"
                width="400"
                height="500"
                style={{ filter: isOutOfStock ? 'grayscale(50%)' : 'none' }}
              />
            )}
          </>
        ) : (
          <div 
            className="product-card__image" 
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
        <div className="product-card__badges">
          {isOutOfStock && (
            <span
              className="badge"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              role="status"
              aria-label="Out of stock"
            >
              Out of Stock
            </span>
          )}
          {!isOutOfStock && stockStatus.status === 'critical_low' && (
            <span
              className="badge"
              style={{ backgroundColor: '#ea580c', color: 'white' }}
              role="status"
              aria-label={stockStatus.label}
            >
              {stockStatus.label}
            </span>
          )}
          {!isOutOfStock && product.isNew && (
            <span
              className="badge badge--new"
              role="status"
              aria-label="New arrival"
            >
              New
            </span>
          )}
          {!isOutOfStock && product.isTrending && (
            <span
              className="badge badge--trending"
              role="status"
              aria-label="Trending product"
            >
              Trending
            </span>
          )}
          {!isOutOfStock && product.discount > 0 && (
            <span
              className="badge badge--sale"
              role="status"
              aria-label={`${product.discount}% discount`}
            >
              -{product.discount}%
            </span>
          )}
        </div>
        <div className="product-card__actions">
          <button
            className="product-card__action-btn"
            aria-label={
              isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'
            }
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
          <button
            className="product-card__action-btn"
            aria-label={`Quick view ${product.name}`}
            onClick={(e) => e.preventDefault()}
          >
            <Eye size={16} />
          </button>
        </div>
        {!isOutOfStock && (
          <div
            className="product-card__quick-add"
            onClick={(e) => e.preventDefault()}
            role="button"
            tabIndex={0}
          >
            <ShoppingBag
              size={14}
              style={{
                display: 'inline',
                marginRight: '6px',
                verticalAlign: 'middle',
              }}
            />
            Quick Add
          </div>
        )}
      </div>
      <div className="product-card__info">
        <p className="product-card__brand">{product.brand}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <div className="product-card__price">
          <span className="product-card__price--current">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <>
              <span className="product-card__price--original">
                {formatPrice(product.originalPrice)}
              </span>
              <span className="product-card__price--discount">
                ({product.discount}% off)
              </span>
            </>
          )}
        </div>
        {product.colors && product.colors.length > 0 && (
          <div
            className="product-card__colors"
            role="list"
            aria-label="Available colors"
          >
            {product.colors.map((c) => (
              <span
                key={c.name}
                className="product-card__color-dot"
                style={{ backgroundColor: c.hex }}
                title={c.name}
                role="listitem"
                aria-label={c.name}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

const FilterSidebar = memo(function FilterSidebar({ onFilterChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openSections, setOpenSections] = useState({
    category: true,
    price: true,
    size: true,
    color: true,
  });

  // Get current filters
  const currentCategories = searchParams.getAll('category');
  const currentSizes = searchParams.getAll('size');
  const currentColors = searchParams.getAll('color');
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  // Memoize toggle function to prevent unnecessary re-renders
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
    if (onFilterChange) onFilterChange();
  }, [searchParams, setSearchParams, onFilterChange]);

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

  return (
    <aside className="filter-sidebar">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-semibold)',
            fontFamily: 'var(--font-primary)',
          }}
        >
          Filters
        </h3>
        {(currentCategories.length > 0 ||
          currentSizes.length > 0 ||
          currentColors.length > 0 ||
          minPrice ||
          maxPrice) && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={clearAllFilters}
            style={{ fontSize: 'var(--text-xs)', padding: '0' }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div className="filter-sidebar__section">
        <button
          className="filter-sidebar__title"
          onClick={() => toggle('category')}
        >
          Category{' '}
          <ChevronDown
            size={16}
            style={{
              transform: openSections.category ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        {openSections.category && (
          <div className="filter-sidebar__options">
            {CATEGORIES.map((cat) => (
              <label key={cat.id} className="checkbox">
                <input
                  type="checkbox"
                  className="checkbox__input"
                  checked={currentCategories.includes(cat.slug)}
                  onChange={() => updateFilter('category', cat.slug)}
                />
                <span>{cat.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="filter-sidebar__section">
        <button
          className="filter-sidebar__title"
          onClick={() => toggle('price')}
        >
          Price{' '}
          <ChevronDown
            size={16}
            style={{
              transform: openSections.price ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        {openSections.price && (
          <div className="price-range">
            <input
              type="number"
              className="price-range__input"
              placeholder="₹ Min"
              value={minPrice}
              onChange={(e) => updatePrice('minPrice', e.target.value)}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
            <input
              type="number"
              className="price-range__input"
              placeholder="₹ Max"
              value={maxPrice}
              onChange={(e) => updatePrice('maxPrice', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Size */}
      <div className="filter-sidebar__section">
        <button
          className="filter-sidebar__title"
          onClick={() => toggle('size')}
        >
          Size{' '}
          <ChevronDown
            size={16}
            style={{
              transform: openSections.size ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        {openSections.size && (
          <div className="filter-sidebar__size-options">
            {sizes.map((s) => (
              <button
                key={s}
                className={`filter-sidebar__size ${currentSizes.includes(s) ? 'filter-sidebar__size--active' : ''}`}
                onClick={() => updateFilter('size', s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Color */}
      <div className="filter-sidebar__section">
        <button
          className="filter-sidebar__title"
          onClick={() => toggle('color')}
        >
          Color{' '}
          <ChevronDown
            size={16}
            style={{
              transform: openSections.color ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        {openSections.color && (
          <div className="filter-sidebar__color-options">
            {colorOptions.map((c) => (
              <button
                key={c.name}
                className={`filter-sidebar__color ${currentColors.includes(c.name) ? 'filter-sidebar__color--active' : ''}`}
                style={{
                  backgroundColor: c.hex,
                  border:
                    c.hex === '#FFFFFF'
                      ? '1px solid var(--color-border)'
                      : 'none',
                }}
                title={c.name}
                aria-label={c.name}
                onClick={() => updateFilter('color', c.name)}
              />
            ))}
          </div>
        )}
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

  const currentPage = Number(searchParams.get('page')) || 1;
  const rawSearchQuery = searchParams.get('search')?.trim() || '';

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
    <div className="page">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={`${selectedCategory || 'clothing'}, streetwear, fashion, online shopping, India`}
      />
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb__link">
            Home
          </Link>
          <span className="breadcrumb__separator">/</span>
          <span className="breadcrumb__current">All Products</span>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          className="filter-toggle"
          onClick={() => setMobileFilterOpen(true)}
        >
          <SlidersHorizontal size={16} /> Filters{' '}
          {searchParams.toString() && products.length !== pagination.totalItems
            ? '(Active)'
            : ''}
        </button>

        <div className="plp">
          <FilterSidebar />

          <div>
            <div className="plp__header">
              <p className="plp__count">
                {pagination.totalItems} Product
                {pagination.totalItems !== 1 ? 's' : ''} Found
                {searchParams.get('search') &&
                  ` for "${searchParams.get('search')}"`}
              </p>
              <div className="plp__sort">
                <span className="plp__sort-label">Sort by:</span>
                <select
                  className="plp__sort-select"
                  value={searchParams.get('sort') || 'recommended'}
                  onChange={handleSortChange}
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>

            {isLoading && !data ? (
              <div className="product-grid">
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
                      background: 'var(--color-primary)',
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
                    className="product-grid"
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
                  <div className="pagination">
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
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--color-text-muted)',
                }}
              >
                <ShoppingBag
                  size={48}
                  style={{ margin: '0 auto 20px', opacity: 0.5 }}
                />
                <h3>No products found</h3>
                <p>Try adjusting your filters or search criteria.</p>
                <button
                  className="btn btn--primary"
                  style={{ marginTop: '20px' }}
                  onClick={() => setSearchParams({})}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {mobileFilterOpen && (
        <div
          className="modal-overlay"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '340px',
              height: '100vh',
              borderRadius: 0,
              position: 'fixed',
              left: 0,
              top: 0,
            }}
          >
            <div className="modal__header">
              <h3 className="modal__title">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal__body">
              <FilterSidebar
                onFilterChange={() =>
                  setTimeout(() => setMobileFilterOpen(false), 300)
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

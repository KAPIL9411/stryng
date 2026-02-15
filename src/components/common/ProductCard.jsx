/**
 * Reusable Product Card Component
 * Used across Home, ProductListing, Wishlist, etc.
 */
import { memo, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { getStockStatus } from '../../lib/inventory';
import useStore from '../../store/useStore';
import OptimizedImage from '../OptimizedImage';

function ProductCard({
  product,
  priority = false,
  showQuickAdd = true,
}) {
  const { toggleWishlist, isInWishlist } = useStore();
  const isWishlisted = isInWishlist(product.id);

  // Memoize expensive calculations
  const stockStatus = useMemo(
    () => getStockStatus(product.stock, product.lowStockThreshold),
    [product.stock, product.lowStockThreshold]
  );
  
  const isOutOfStock = useMemo(
    () => product.stock !== undefined && product.stock === 0,
    [product.stock]
  );

  const formattedPrice = useMemo(
    () => formatPrice(product.price),
    [product.price]
  );

  const formattedOriginalPrice = useMemo(
    () => product.originalPrice > product.price ? formatPrice(product.originalPrice) : null,
    [product.originalPrice, product.price]
  );

  // Memoize event handlers
  const handleWishlistToggle = useCallback((e) => {
    e.preventDefault();
    toggleWishlist(product);
  }, [toggleWishlist, product]);

  const handleQuickView = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleQuickAdd = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="product-card"
      style={{ opacity: isOutOfStock ? 0.7 : 1 }}
    >
      <div className="product-card__image-wrapper">
        <OptimizedImage
          src={product.images[0]}
          alt={product.name}
          preset="card"
          eager={priority}
          className="product-card__image"
          style={{ filter: isOutOfStock ? 'grayscale(50%)' : 'none' }}
        />
        {product.images[1] && (
          <OptimizedImage
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            preset="card"
            className="product-card__hover-image"
            style={{ filter: isOutOfStock ? 'grayscale(50%)' : 'none' }}
          />
        )}

        <div className="product-card__badges">
          {isOutOfStock && (
            <span
              className="badge"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
            >
              Out of Stock
            </span>
          )}
          {!isOutOfStock && stockStatus.status === 'critical_low' && (
            <span
              className="badge"
              style={{ backgroundColor: '#ea580c', color: 'white' }}
            >
              {stockStatus.label}
            </span>
          )}
          {!isOutOfStock && product.isNew && (
            <span className="badge badge--new">New</span>
          )}
          {!isOutOfStock && product.isTrending && (
            <span className="badge badge--trending">Trending</span>
          )}
          {!isOutOfStock && product.discount > 0 && (
            <span className="badge badge--sale">-{product.discount}%</span>
          )}
        </div>

        <div className="product-card__actions">
          <button
            className="product-card__action-btn"
            aria-label={
              isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'
            }
            onClick={handleWishlistToggle}
          >
            <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
          <button
            className="product-card__action-btn"
            aria-label={`Quick view ${product.name}`}
            onClick={handleQuickView}
          >
            <Eye size={16} />
          </button>
        </div>

        {!isOutOfStock && showQuickAdd && (
          <div
            className="product-card__quick-add"
            onClick={handleQuickAdd}
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
            {formattedPrice}
          </span>
          {formattedOriginalPrice && (
            <>
              <span className="product-card__price--original">
                {formattedOriginalPrice}
              </span>
              <span className="product-card__price--discount">
                ({product.discount}% off)
              </span>
            </>
          )}
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className="product-card__colors">
            {product.colors.map((color) => (
              <span
                key={color.name}
                className="product-card__color-dot"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if product data, priority, or showQuickAdd changes
export default memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock === nextProps.product.stock &&
    prevProps.product.images[0] === nextProps.product.images[0] &&
    prevProps.priority === nextProps.priority &&
    prevProps.showQuickAdd === nextProps.showQuickAdd
  );
});

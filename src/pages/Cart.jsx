import { Link } from 'react-router-dom';
import {
  Minus,
  Plus,
  X,
  ArrowRight,
  Tag,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/format';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';

// Memoized CartItem component to prevent unnecessary re-renders
const CartItem = memo(({ item, onUpdateQuantity, onRemove }) => {
  const totalPrice = useMemo(
    () => formatPrice(item.price * item.quantity),
    [item.price, item.quantity]
  );

  const handleIncrement = useCallback(() => {
    onUpdateQuantity(item.cartId, 1);
  }, [item.cartId, onUpdateQuantity]);

  const handleDecrement = useCallback(() => {
    onUpdateQuantity(item.cartId, -1);
  }, [item.cartId, onUpdateQuantity]);

  const handleRemove = useCallback(() => {
    onRemove(item.cartId);
  }, [item.cartId, onRemove]);

  return (
    <div className="cart-item">
      <Link
        to={`/products/${item.slug}`}
        className="cart-item__image"
      >
        <img src={item.images[0]} alt={item.name} loading="lazy" />
      </Link>
      <div>
        <Link
          to={`/products/${item.slug}`}
          className="cart-item__name"
        >
          {item.name}
        </Link>
        <p className="cart-item__variant">
          Size: {item.selectedSize} | Color:{' '}
          {item.selectedColor?.name}
        </p>
        <div
          className="qty-stepper"
          style={{ marginBottom: 'var(--space-2)' }}
        >
          <button
            className="qty-stepper__btn"
            onClick={handleDecrement}
            disabled={item.quantity <= 1}
          >
            <Minus size={14} />
          </button>
          <span className="qty-stepper__value">{item.quantity}</span>
          <button
            className="qty-stepper__btn"
            onClick={handleIncrement}
          >
            <Plus size={14} />
          </button>
        </div>
        <p className="cart-item__price">
          {totalPrice}
        </p>
        <button
          className="cart-item__remove"
          onClick={handleRemove}
        >
          Remove
        </button>
      </div>
      <button
        style={{
          alignSelf: 'start',
          color: 'var(--color-text-muted)',
        }}
        aria-label="Remove item"
        onClick={handleRemove}
      >
        <X size={18} />
      </button>
    </div>
  );
});

CartItem.displayName = 'CartItem';

// Memoized FeaturedProduct component
const FeaturedProduct = memo(({ product }) => {
  const formattedPrice = useMemo(
    () => formatPrice(product.price),
    [product.price]
  );

  const formattedOriginalPrice = useMemo(
    () => product.originalPrice ? formatPrice(product.originalPrice) : null,
    [product.originalPrice]
  );

  return (
    <Link
      to={`/products/${product.slug}`}
      className="empty-cart__product-card"
    >
      <div className="empty-cart__product-image">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
        />
        {product.isNew && (
          <span className="badge badge--new">New</span>
        )}
        {product.isTrending && (
          <span className="badge badge--trending">
            Trending
          </span>
        )}
      </div>
      <div className="empty-cart__product-info">
        <h4>{product.name}</h4>
        <div className="empty-cart__product-price">
          <span className="price">
            {formattedPrice}
          </span>
          {formattedOriginalPrice && (
            <span className="price--original">
              {formattedOriginalPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

FeaturedProduct.displayName = 'FeaturedProduct';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, products, fetchProducts } =
    useStore();
  const [featuredProducts, setFeaturedProducts] = useState([]);

  // Memoize expensive calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const shipping = useMemo(
    () => subtotal > 999 ? 0 : 99,
    [subtotal]
  );

  const tax = useMemo(
    () => Math.round(subtotal * 0.18),
    [subtotal]
  );

  const total = useMemo(
    () => subtotal + shipping + tax,
    [subtotal, shipping, tax]
  );

  const formattedSubtotal = useMemo(
    () => formatPrice(subtotal),
    [subtotal]
  );

  const formattedShipping = useMemo(
    () => shipping === 0 ? 'FREE' : formatPrice(shipping),
    [shipping]
  );

  const formattedTax = useMemo(
    () => formatPrice(tax),
    [tax]
  );

  const formattedTotal = useMemo(
    () => formatPrice(total),
    [total]
  );

  // Memoize event handlers
  const handleUpdateQuantity = useCallback((cartId, delta) => {
    updateQuantity(cartId, delta);
  }, [updateQuantity]);

  const handleRemoveFromCart = useCallback((cartId) => {
    removeFromCart(cartId);
  }, [removeFromCart]);

  useEffect(() => {
    if (cart.length === 0) {
      // Fetch products if not loaded
      if (products.length === 0) {
        fetchProducts();
      } else {
        // Get trending or new products
        const featured = products
          .filter((p) => p.isTrending || p.isNew)
          .slice(0, 4);
        setFeaturedProducts(featured);
      }
    }
  }, [cart.length, products, fetchProducts]);

  if (cart.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-cart">
            <div className="empty-cart__icon">
              <ShoppingBag size={64} strokeWidth={1.5} />
            </div>

            <h1 className="empty-cart__title">Your Cart is Empty</h1>
            <p className="empty-cart__subtitle">
              But it doesn't have to be! Discover our latest collection and find
              something you'll love.
            </p>

            <div className="empty-cart__features">
              <div className="empty-cart__feature">
                <Sparkles size={24} />
                <span>New Arrivals Daily</span>
              </div>
              <div className="empty-cart__feature">
                <TrendingUp size={24} />
                <span>Trending Styles</span>
              </div>
              <div className="empty-cart__feature">
                <Tag size={24} />
                <span>Exclusive Deals</span>
              </div>
            </div>

            <div className="empty-cart__actions">
              <Link to="/products" className="btn btn--primary btn--lg">
                Explore Collection <ArrowRight size={18} />
              </Link>
              <Link
                to="/products?filter=trending"
                className="btn btn--secondary btn--lg"
              >
                View Trending
              </Link>
            </div>

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <div className="empty-cart__products">
                <h3>You Might Like These</h3>
                <div className="empty-cart__products-grid">
                  {featuredProducts.map((product) => (
                    <FeaturedProduct key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`
                    .empty-cart {
                        text-align: center;
                        padding: 4rem 2rem;
                        max-width: 900px;
                        margin: 0 auto;
                    }

                    .empty-cart__icon {
                        width: 120px;
                        height: 120px;
                        margin: 0 auto 2rem;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(201, 169, 110, 0.1) 0%, rgba(201, 169, 110, 0.05) 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--color-accent);
                        animation: float 3s ease-in-out infinite;
                    }

                    @keyframes float {
                        0%, 100% {
                            transform: translateY(0);
                        }
                        50% {
                            transform: translateY(-10px);
                        }
                    }

                    .empty-cart__title {
                        font-size: 2.5rem;
                        margin-bottom: 1rem;
                        font-weight: var(--font-bold);
                    }

                    .empty-cart__subtitle {
                        font-size: 1.125rem;
                        color: var(--color-text-secondary);
                        margin-bottom: 3rem;
                        max-width: 500px;
                        margin-left: auto;
                        margin-right: auto;
                        line-height: 1.6;
                    }

                    .empty-cart__features {
                        display: flex;
                        justify-content: center;
                        gap: 3rem;
                        margin-bottom: 3rem;
                        flex-wrap: wrap;
                    }

                    .empty-cart__feature {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.75rem;
                        color: var(--color-text-secondary);
                    }

                    .empty-cart__feature svg {
                        color: var(--color-accent);
                    }

                    .empty-cart__feature span {
                        font-size: 0.9375rem;
                        font-weight: var(--font-medium);
                    }

                    .empty-cart__actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                        margin-bottom: 4rem;
                        flex-wrap: wrap;
                    }

                    .empty-cart__products {
                        margin-top: 4rem;
                        padding-top: 4rem;
                        border-top: 1px solid var(--color-border);
                    }

                    .empty-cart__products h3 {
                        font-size: 1.75rem;
                        margin-bottom: 2rem;
                        font-weight: var(--font-semibold);
                    }

                    .empty-cart__products-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 1.5rem;
                    }

                    .empty-cart__product-card {
                        text-decoration: none;
                        color: inherit;
                        transition: transform 0.3s ease;
                    }

                    .empty-cart__product-card:hover {
                        transform: translateY(-5px);
                    }

                    .empty-cart__product-image {
                        position: relative;
                        aspect-ratio: 3/4;
                        overflow: hidden;
                        background: var(--color-bg-secondary);
                        margin-bottom: 1rem;
                    }

                    .empty-cart__product-image img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.3s ease;
                    }

                    .empty-cart__product-card:hover .empty-cart__product-image img {
                        transform: scale(1.05);
                    }

                    .empty-cart__product-image .badge {
                        position: absolute;
                        top: 0.75rem;
                        left: 0.75rem;
                    }

                    .badge--new {
                        background: var(--color-accent);
                        color: var(--color-text-primary);
                        padding: 0.25rem 0.75rem;
                        font-size: 0.75rem;
                        font-weight: var(--font-semibold);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .badge--trending {
                        background: var(--color-text-primary);
                        color: var(--color-bg-primary);
                        padding: 0.25rem 0.75rem;
                        font-size: 0.75rem;
                        font-weight: var(--font-semibold);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .empty-cart__product-info {
                        text-align: left;
                    }

                    .empty-cart__product-info h4 {
                        font-size: 0.9375rem;
                        margin-bottom: 0.5rem;
                        font-weight: var(--font-medium);
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .empty-cart__product-price {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    .empty-cart__product-price .price {
                        font-weight: var(--font-semibold);
                        font-size: 1rem;
                    }

                    .empty-cart__product-price .price--original {
                        font-size: 0.875rem;
                        color: var(--color-text-secondary);
                        text-decoration: line-through;
                    }

                    @media (max-width: 768px) {
                        .empty-cart {
                            padding: 3rem 1rem;
                        }

                        .empty-cart__title {
                            font-size: 2rem;
                        }

                        .empty-cart__subtitle {
                            font-size: 1rem;
                        }

                        .empty-cart__features {
                            gap: 2rem;
                        }

                        .empty-cart__actions {
                            flex-direction: column;
                        }

                        .empty-cart__actions .btn {
                            width: 100%;
                        }

                        .empty-cart__products-grid {
                            grid-template-columns: repeat(2, 1fr);
                            gap: 1rem;
                        }
                    }
                `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h1
          style={{
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-8)',
          }}
        >
          Shopping Bag ({cart.length})
        </h1>

        <div className="cart-page">
          {/* Cart Items */}
          <div>
            {cart.map((item) => (
              <CartItem
                key={item.cartId}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveFromCart}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="cart-summary">
            <h3 className="cart-summary__title">Order Summary</h3>
            <div className="cart-summary__row">
              <span>Subtotal</span>
              <span>{formattedSubtotal}</span>
            </div>
            <div className="cart-summary__row">
              <span>Shipping</span>
              <span>{formattedShipping}</span>
            </div>
            <div className="cart-summary__row">
              <span>Tax (GST 18%)</span>
              <span>{formattedTax}</span>
            </div>
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <span>{formattedTotal}</span>
            </div>

            <div className="cart-summary__coupon">
              <input
                type="text"
                className="cart-summary__coupon-input"
                placeholder="Coupon code"
              />
              <button className="btn btn--secondary btn--sm">
                <Tag size={14} /> Apply
              </button>
            </div>

            <Link
              to="/checkout"
              className="btn btn--primary btn--full btn--lg"
              style={{ marginTop: 'var(--space-4)' }}
            >
              Checkout <ArrowRight size={18} />
            </Link>

            <Link
              to="/products"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 'var(--space-4)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                textDecoration: 'underline',
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  Minus,
  Plus,
  X,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/format';
import { useMemo, useCallback, memo } from 'react';
import CouponInput from '../components/checkout/CouponInput';
import AppliedCoupon from '../components/checkout/AppliedCoupon';

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

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, couponDiscount } =
    useStore();

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
    () => Math.round((subtotal - couponDiscount) * 0.18),
    [subtotal, couponDiscount]
  );

  const total = useMemo(
    () => subtotal + shipping + tax - couponDiscount,
    [subtotal, shipping, tax, couponDiscount]
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

  if (cart.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-cart">
            <div className="empty-cart__icon">
              <ShoppingBag size={56} strokeWidth={1.5} />
            </div>

            <h1 className="empty-cart__title">I'm Empty!</h1>
            <p className="empty-cart__subtitle">
              I've got room for anything.
            </p>

            <Link to="/products" className="empty-cart__button">
              Go Shopping!
            </Link>
          </div>
        </div>

        <style>{`
                    .empty-cart {
                        text-align: center;
                        padding: 6rem 2rem;
                        max-width: 500px;
                        margin: 0 auto;
                        min-height: 60vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    .empty-cart__icon {
                        width: 140px;
                        height: 140px;
                        margin: 0 auto 2.5rem;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.06) 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--color-accent);
                        animation: gentleFloat 4s ease-in-out infinite;
                        box-shadow: 0 10px 30px rgba(201, 169, 110, 0.1);
                    }

                    @keyframes gentleFloat {
                        0%, 100% {
                            transform: translateY(0);
                        }
                        50% {
                            transform: translateY(-12px);
                        }
                    }

                    .empty-cart__title {
                        font-size: 2.75rem;
                        margin-bottom: 0.75rem;
                        font-weight: var(--font-bold);
                        color: var(--color-text-primary);
                        letter-spacing: -0.02em;
                        animation: fadeInUp 0.6s ease-out 0.2s both;
                    }

                    .empty-cart__subtitle {
                        font-size: 1.125rem;
                        color: var(--color-text-secondary);
                        margin-bottom: 2.5rem;
                        line-height: 1.5;
                        animation: fadeInUp 0.6s ease-out 0.3s both;
                    }

                    .empty-cart__button {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 1rem 3rem;
                        font-size: 1.125rem;
                        font-weight: var(--font-semibold);
                        color: #fff;
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                        border: none;
                        border-radius: 50px;
                        text-decoration: none;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                        animation: fadeInUp 0.6s ease-out 0.4s both;
                    }

                    .empty-cart__button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
                        background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
                    }

                    .empty-cart__button:active {
                        transform: translateY(0);
                        box-shadow: 0 2px 10px rgba(231, 76, 60, 0.3);
                    }

                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    @media (max-width: 768px) {
                        .empty-cart {
                            padding: 4rem 1.5rem;
                            min-height: 50vh;
                        }

                        .empty-cart__icon {
                            width: 120px;
                            height: 120px;
                            margin-bottom: 2rem;
                        }

                        .empty-cart__icon svg {
                            width: 48px;
                            height: 48px;
                        }

                        .empty-cart__title {
                            font-size: 2.25rem;
                        }

                        .empty-cart__subtitle {
                            font-size: 1rem;
                            margin-bottom: 2rem;
                        }

                        .empty-cart__button {
                            padding: 0.875rem 2.5rem;
                            font-size: 1rem;
                            width: 100%;
                            max-width: 280px;
                        }
                    }

                    @media (max-width: 480px) {
                        .empty-cart {
                            padding: 3rem 1rem;
                        }

                        .empty-cart__icon {
                            width: 100px;
                            height: 100px;
                        }

                        .empty-cart__icon svg {
                            width: 42px;
                            height: 42px;
                        }

                        .empty-cart__title {
                            font-size: 2rem;
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
            {couponDiscount > 0 && (
              <div className="cart-summary__row" style={{ color: 'var(--color-success)' }}>
                <span>Coupon Discount</span>
                <span>-{formatPrice(couponDiscount)}</span>
              </div>
            )}
            <div className="cart-summary__row">
              <span>Tax (GST 18%)</span>
              <span>{formattedTax}</span>
            </div>
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <span>{formattedTotal}</span>
            </div>

            <div style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <AppliedCoupon />
              <CouponInput orderTotal={subtotal} />
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

import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  X,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/format';

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useStore();

  if (wishlist.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-wishlist">
            <div className="empty-wishlist__icon">
              <Heart size={56} strokeWidth={1.5} />
            </div>

            <h1 className="empty-wishlist__title">I'm Empty!</h1>
            <p className="empty-wishlist__subtitle">
              Save your favorite items here.
            </p>

            <Link to="/products" className="empty-wishlist__button">
              Discover Products!
            </Link>
          </div>
        </div>

        <style>{`
                    .empty-wishlist {
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

                    .empty-wishlist__icon {
                        width: 140px;
                        height: 140px;
                        margin: 0 auto 2.5rem;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(220, 38, 38, 0.06) 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #dc2626;
                        animation: gentleHeartbeat 3s ease-in-out infinite;
                        box-shadow: 0 10px 30px rgba(220, 38, 38, 0.15);
                    }

                    @keyframes gentleHeartbeat {
                        0%, 100% {
                            transform: scale(1);
                        }
                        10%, 30% {
                            transform: scale(1.08);
                        }
                        20%, 40% {
                            transform: scale(1);
                        }
                    }

                    .empty-wishlist__title {
                        font-size: 2.75rem;
                        margin-bottom: 0.75rem;
                        font-weight: var(--font-bold);
                        color: var(--color-text-primary);
                        letter-spacing: -0.02em;
                        animation: fadeInUp 0.6s ease-out 0.2s both;
                    }

                    .empty-wishlist__subtitle {
                        font-size: 1.125rem;
                        color: var(--color-text-secondary);
                        margin-bottom: 2.5rem;
                        line-height: 1.5;
                        animation: fadeInUp 0.6s ease-out 0.3s both;
                    }

                    .empty-wishlist__button {
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

                    .empty-wishlist__button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
                        background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
                    }

                    .empty-wishlist__button:active {
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
                        .empty-wishlist {
                            padding: 4rem 1.5rem;
                            min-height: 50vh;
                        }

                        .empty-wishlist__icon {
                            width: 120px;
                            height: 120px;
                            margin-bottom: 2rem;
                        }

                        .empty-wishlist__icon svg {
                            width: 48px;
                            height: 48px;
                        }

                        .empty-wishlist__title {
                            font-size: 2.25rem;
                        }

                        .empty-wishlist__subtitle {
                            font-size: 1rem;
                            margin-bottom: 2rem;
                        }

                        .empty-wishlist__button {
                            padding: 0.875rem 2.5rem;
                            font-size: 1rem;
                            width: 100%;
                            max-width: 280px;
                        }
                    }

                    @media (max-width: 480px) {
                        .empty-wishlist {
                            padding: 3rem 1rem;
                        }

                        .empty-wishlist__icon {
                            width: 100px;
                            height: 100px;
                        }

                        .empty-wishlist__icon svg {
                            width: 42px;
                            height: 42px;
                        }

                        .empty-wishlist__title {
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
            marginBottom: 'var(--space-2)',
          }}
        >
          My Wishlist
        </h1>
        <p
          style={{
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-8)',
          }}
        >
          {wishlist.length} items saved
        </p>

        <div className="wishlist-grid">
          {wishlist.map((product) => (
            <div key={product.id} className="wishlist-item">
              <button
                className="wishlist-item__remove"
                aria-label="Remove from wishlist"
                onClick={() => toggleWishlist(product)}
              >
                <X size={16} />
              </button>

              <Link
                to={`/products/${product.slug}`}
                className="product-card"
                style={{ boxShadow: 'none' }}
              >
                <div className="product-card__image-wrapper">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="product-card__image"
                    loading="lazy"
                  />
                  {product.discount > 0 && (
                    <div className="product-card__badges">
                      <span className="badge badge--sale">
                        -{product.discount}%
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className="product-card__info"
                  style={{ padding: 'var(--space-4) 0 0' }}
                >
                  <p className="product-card__brand">{product.brand}</p>
                  <h3 className="product-card__name">{product.name}</h3>
                  <div className="product-card__price">
                    <span className="product-card__price--current">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="product-card__price--original">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              <Link
                to={`/products/${product.slug}`}
                className="btn btn--secondary btn--full btn--sm"
                style={{ marginTop: 'var(--space-4)' }}
              >
                <ShoppingBag size={14} /> Select Options
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

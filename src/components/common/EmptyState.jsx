/**
 * Reusable Empty State Component
 * Used across Cart, Wishlist, and other empty pages
 */
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  features = [],
  primaryAction,
  secondaryAction,
  featuredProducts = [],
  iconColor = 'var(--color-accent)',
  iconAnimation = 'float',
}) {
  return (
    <div className="empty-state">
      <div
        className="empty-state__icon"
        style={{
          background: `linear-gradient(135deg, ${iconColor}15 0%, ${iconColor}05 100%)`,
          animation: `${iconAnimation} 3s ease-in-out infinite`,
        }}
      >
        <Icon size={64} strokeWidth={1.5} style={{ color: iconColor }} />
      </div>

      <h1 className="empty-state__title">{title}</h1>
      <p className="empty-state__subtitle">{subtitle}</p>

      {features.length > 0 && (
        <div className="empty-state__features">
          {features.map((feature, index) => (
            <div key={index} className="empty-state__feature">
              <feature.icon size={24} style={{ color: iconColor }} />
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="empty-state__actions">
        {primaryAction && (
          <Link to={primaryAction.link} className="btn btn--primary btn--lg">
            {primaryAction.text} <ArrowRight size={18} />
          </Link>
        )}
        {secondaryAction && (
          <Link
            to={secondaryAction.link}
            className="btn btn--secondary btn--lg"
          >
            {secondaryAction.text}
          </Link>
        )}
      </div>

      {featuredProducts.length > 0 && (
        <div className="empty-state__products">
          <h3>{featuredProducts.title || 'You Might Like These'}</h3>
          <div className="empty-state__products-grid">
            {featuredProducts.items.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                className="empty-state__product-card"
              >
                <div className="empty-state__product-image">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    loading="lazy"
                  />
                  {product.badge && (
                    <span className={`badge badge--${product.badge.type}`}>
                      {product.badge.text}
                    </span>
                  )}
                </div>
                <div className="empty-state__product-info">
                  {product.brand && <p className="brand">{product.brand}</p>}
                  <h4>{product.name}</h4>
                  <div className="empty-state__product-price">
                    <span className="price">{product.formattedPrice}</span>
                    {product.formattedOriginalPrice && (
                      <span className="price--original">
                        {product.formattedOriginalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    max-width: 900px;
                    margin: 0 auto;
                }

                .empty-state__icon {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 2rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    10%, 30% { transform: scale(1.1); }
                    20%, 40% { transform: scale(1); }
                }

                .empty-state__title {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                    font-weight: var(--font-bold);
                }

                .empty-state__subtitle {
                    font-size: 1.125rem;
                    color: var(--color-text-secondary);
                    margin-bottom: 3rem;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                    line-height: 1.6;
                }

                .empty-state__features {
                    display: flex;
                    justify-content: center;
                    gap: 3rem;
                    margin-bottom: 3rem;
                    flex-wrap: wrap;
                }

                .empty-state__feature {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--color-text-secondary);
                }

                .empty-state__feature span {
                    font-size: 0.9375rem;
                    font-weight: var(--font-medium);
                }

                .empty-state__actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-bottom: 4rem;
                    flex-wrap: wrap;
                }

                .empty-state__products {
                    margin-top: 4rem;
                    padding-top: 4rem;
                    border-top: 1px solid var(--color-border);
                }

                .empty-state__products h3 {
                    font-size: 1.75rem;
                    margin-bottom: 2rem;
                    font-weight: var(--font-semibold);
                }

                .empty-state__products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1.5rem;
                }

                .empty-state__product-card {
                    text-decoration: none;
                    color: inherit;
                    transition: transform 0.3s ease;
                }

                .empty-state__product-card:hover {
                    transform: translateY(-5px);
                }

                .empty-state__product-image {
                    position: relative;
                    aspect-ratio: 3/4;
                    overflow: hidden;
                    background: var(--color-bg-secondary);
                    margin-bottom: 1rem;
                }

                .empty-state__product-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }

                .empty-state__product-card:hover .empty-state__product-image img {
                    transform: scale(1.05);
                }

                .empty-state__product-image .badge {
                    position: absolute;
                    top: 0.75rem;
                    left: 0.75rem;
                    padding: 0.25rem 0.75rem;
                    font-size: 0.75rem;
                    font-weight: var(--font-semibold);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .empty-state__product-info {
                    text-align: left;
                }

                .empty-state__product-info .brand {
                    font-size: 0.8125rem;
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.25rem;
                }

                .empty-state__product-info h4 {
                    font-size: 0.9375rem;
                    margin-bottom: 0.5rem;
                    font-weight: var(--font-medium);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .empty-state__product-price {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .empty-state__product-price .price {
                    font-weight: var(--font-semibold);
                    font-size: 1rem;
                }

                .empty-state__product-price .price--original {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                    text-decoration: line-through;
                }

                @media (max-width: 768px) {
                    .empty-state {
                        padding: 3rem 1rem;
                    }

                    .empty-state__title {
                        font-size: 2rem;
                    }

                    .empty-state__subtitle {
                        font-size: 1rem;
                    }

                    .empty-state__features {
                        gap: 2rem;
                    }

                    .empty-state__actions {
                        flex-direction: column;
                    }

                    .empty-state__actions .btn {
                        width: 100%;
                    }

                    .empty-state__products-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1rem;
                    }
                }
            `}</style>
    </div>
  );
}

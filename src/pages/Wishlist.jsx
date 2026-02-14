
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, X, ArrowRight, Sparkles, TrendingUp, Tag } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../lib/dummyData';
import { useState, useEffect } from 'react';

export default function Wishlist() {
    const { wishlist, toggleWishlist, products, fetchProducts } = useStore();
    const [featuredProducts, setFeaturedProducts] = useState([]);

    useEffect(() => {
        if (wishlist.length === 0) {
            // Fetch products if not loaded
            if (products.length === 0) {
                fetchProducts();
            } else {
                // Get trending or new products
                const featured = products
                    .filter(p => p.isTrending || p.isNew)
                    .slice(0, 4);
                setFeaturedProducts(featured);
            }
        }
    }, [wishlist.length, products, fetchProducts]);

    if (wishlist.length === 0) {
        return (
            <div className="page">
                <div className="container">
                    <div className="empty-wishlist">
                        <div className="empty-wishlist__icon">
                            <Heart size={64} strokeWidth={1.5} />
                        </div>
                        
                        <h1 className="empty-wishlist__title">Your Wishlist is Empty</h1>
                        <p className="empty-wishlist__subtitle">
                            Start saving your favorite items! Click the heart icon on any product to add it to your wishlist.
                        </p>

                        <div className="empty-wishlist__features">
                            <div className="empty-wishlist__feature">
                                <Heart size={24} />
                                <span>Save Favorites</span>
                            </div>
                            <div className="empty-wishlist__feature">
                                <Sparkles size={24} />
                                <span>Track Price Drops</span>
                            </div>
                            <div className="empty-wishlist__feature">
                                <ShoppingBag size={24} />
                                <span>Quick Checkout</span>
                            </div>
                        </div>

                        <div className="empty-wishlist__actions">
                            <Link to="/products" className="btn btn--primary btn--lg">
                                Discover Products <ArrowRight size={18} />
                            </Link>
                            <Link to="/products?filter=new" className="btn btn--secondary btn--lg">
                                View New Arrivals
                            </Link>
                        </div>

                        {/* Featured Products */}
                        {featuredProducts.length > 0 && (
                            <div className="empty-wishlist__products">
                                <h3>Products You'll Love</h3>
                                <div className="empty-wishlist__products-grid">
                                    {featuredProducts.map((product) => (
                                        <Link 
                                            key={product.id} 
                                            to={`/products/${product.slug}`}
                                            className="empty-wishlist__product-card"
                                        >
                                            <div className="empty-wishlist__product-image">
                                                <img src={product.images[0]} alt={product.name} loading="lazy" />
                                                {product.discount > 0 && (
                                                    <span className="badge badge--sale">-{product.discount}%</span>
                                                )}
                                                {product.isNew && (
                                                    <span className="badge badge--new">New</span>
                                                )}
                                            </div>
                                            <div className="empty-wishlist__product-info">
                                                <p className="brand">{product.brand}</p>
                                                <h4>{product.name}</h4>
                                                <div className="empty-wishlist__product-price">
                                                    <span className="price">{formatPrice(product.price)}</span>
                                                    {product.originalPrice && product.originalPrice > product.price && (
                                                        <span className="price--original">{formatPrice(product.originalPrice)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    .empty-wishlist {
                        text-align: center;
                        padding: 4rem 2rem;
                        max-width: 900px;
                        margin: 0 auto;
                    }

                    .empty-wishlist__icon {
                        width: 120px;
                        height: 120px;
                        margin: 0 auto 2rem;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #dc2626;
                        animation: heartbeat 2s ease-in-out infinite;
                    }

                    @keyframes heartbeat {
                        0%, 100% {
                            transform: scale(1);
                        }
                        10%, 30% {
                            transform: scale(1.1);
                        }
                        20%, 40% {
                            transform: scale(1);
                        }
                    }

                    .empty-wishlist__title {
                        font-size: 2.5rem;
                        margin-bottom: 1rem;
                        font-weight: var(--font-bold);
                    }

                    .empty-wishlist__subtitle {
                        font-size: 1.125rem;
                        color: var(--color-text-secondary);
                        margin-bottom: 3rem;
                        max-width: 500px;
                        margin-left: auto;
                        margin-right: auto;
                        line-height: 1.6;
                    }

                    .empty-wishlist__features {
                        display: flex;
                        justify-content: center;
                        gap: 3rem;
                        margin-bottom: 3rem;
                        flex-wrap: wrap;
                    }

                    .empty-wishlist__feature {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.75rem;
                        color: var(--color-text-secondary);
                    }

                    .empty-wishlist__feature svg {
                        color: #dc2626;
                    }

                    .empty-wishlist__feature span {
                        font-size: 0.9375rem;
                        font-weight: var(--font-medium);
                    }

                    .empty-wishlist__actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                        margin-bottom: 4rem;
                        flex-wrap: wrap;
                    }

                    .empty-wishlist__products {
                        margin-top: 4rem;
                        padding-top: 4rem;
                        border-top: 1px solid var(--color-border);
                    }

                    .empty-wishlist__products h3 {
                        font-size: 1.75rem;
                        margin-bottom: 2rem;
                        font-weight: var(--font-semibold);
                    }

                    .empty-wishlist__products-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 1.5rem;
                    }

                    .empty-wishlist__product-card {
                        text-decoration: none;
                        color: inherit;
                        transition: transform 0.3s ease;
                        position: relative;
                    }

                    .empty-wishlist__product-card:hover {
                        transform: translateY(-5px);
                    }

                    .empty-wishlist__product-image {
                        position: relative;
                        aspect-ratio: 3/4;
                        overflow: hidden;
                        background: var(--color-bg-secondary);
                        margin-bottom: 1rem;
                    }

                    .empty-wishlist__product-image img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.3s ease;
                    }

                    .empty-wishlist__product-card:hover .empty-wishlist__product-image img {
                        transform: scale(1.05);
                    }

                    .empty-wishlist__product-image .badge {
                        position: absolute;
                        top: 0.75rem;
                        left: 0.75rem;
                    }

                    .badge--sale {
                        background: #dc2626;
                        color: white;
                        padding: 0.25rem 0.75rem;
                        font-size: 0.75rem;
                        font-weight: var(--font-semibold);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
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

                    .empty-wishlist__product-info {
                        text-align: left;
                    }

                    .empty-wishlist__product-info .brand {
                        font-size: 0.8125rem;
                        color: var(--color-text-secondary);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 0.25rem;
                    }

                    .empty-wishlist__product-info h4 {
                        font-size: 0.9375rem;
                        margin-bottom: 0.5rem;
                        font-weight: var(--font-medium);
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .empty-wishlist__product-price {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    .empty-wishlist__product-price .price {
                        font-weight: var(--font-semibold);
                        font-size: 1rem;
                    }

                    .empty-wishlist__product-price .price--original {
                        font-size: 0.875rem;
                        color: var(--color-text-secondary);
                        text-decoration: line-through;
                    }

                    @media (max-width: 768px) {
                        .empty-wishlist {
                            padding: 3rem 1rem;
                        }

                        .empty-wishlist__title {
                            font-size: 2rem;
                        }

                        .empty-wishlist__subtitle {
                            font-size: 1rem;
                        }

                        .empty-wishlist__features {
                            gap: 2rem;
                        }

                        .empty-wishlist__actions {
                            flex-direction: column;
                        }

                        .empty-wishlist__actions .btn {
                            width: 100%;
                        }

                        .empty-wishlist__products-grid {
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
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>My Wishlist</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>{wishlist.length} items saved</p>

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

                            <Link to={`/products/${product.slug}`} className="product-card" style={{ boxShadow: 'none' }}>
                                <div className="product-card__image-wrapper">
                                    <img src={product.images[0]} alt={product.name} className="product-card__image" loading="lazy" />
                                    {product.discount > 0 && (
                                        <div className="product-card__badges">
                                            <span className="badge badge--sale">-{product.discount}%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="product-card__info" style={{ padding: 'var(--space-4) 0 0' }}>
                                    <p className="product-card__brand">{product.brand}</p>
                                    <h3 className="product-card__name">{product.name}</h3>
                                    <div className="product-card__price">
                                        <span className="product-card__price--current">{formatPrice(product.price)}</span>
                                        {product.originalPrice > product.price && (
                                            <span className="product-card__price--original">{formatPrice(product.originalPrice)}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>

                            <Link to={`/products/${product.slug}`} className="btn btn--secondary btn--full btn--sm" style={{ marginTop: 'var(--space-4)' }}>
                                <ShoppingBag size={14} /> Select Options
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

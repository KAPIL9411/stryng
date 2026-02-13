
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, X, ArrowRight } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../lib/dummyData';

export default function Wishlist() {
    const { wishlist, toggleWishlist } = useStore();

    if (wishlist.length === 0) {
        return (
            <div className="page">
                <div className="container" style={{ textAlign: 'center', padding: 'var(--space-24) 0' }}>
                    <div style={{
                        width: '80px', height: '80px', background: 'var(--color-bg-secondary)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-6)'
                    }}>
                        <Heart size={32} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>Your wishlist is empty</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
                        Save items you love to your wishlist and revisit them anytime.
                    </p>
                    <Link to="/products" className="btn btn--primary">Browse Products</Link>
                </div>
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

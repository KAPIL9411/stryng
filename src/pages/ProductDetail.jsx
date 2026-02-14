import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Truck, RotateCcw, Shield, ChevronRight, Minus, Plus } from 'lucide-react';
import { reviews as allReviews, formatPrice, sizeGuide } from '../lib/dummyData';
import useStore from '../store/useStore';
import SEO, { generateProductSchema, injectStructuredData } from '../components/SEO';
import { trackProductView } from '../lib/analytics';
import { useProduct, useProducts } from '../hooks/useProducts';

function StarRating({ rating, size = 16 }) {
    return (
        <div className="stars">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    size={size}
                    className={i <= Math.floor(rating) ? 'stars__star stars__star--filled' : 'stars__star'}
                    fill={i <= Math.floor(rating) ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
}

export default function ProductDetail() {
    const { slug } = useParams();
    const { addToCart, toggleWishlist, wishlist, showToast } = useStore();
    
    // Fetch single product by slug using React Query
    const { data: product, isLoading: isLoadingProduct, isError } = useProduct(slug);
    
    // Fetch related products (first 4 products for simplicity)
    const { data: relatedData } = useProducts(1, 4, {});
    const relatedProducts = relatedData?.products || [];
    
    // All hooks must be called unconditionally (before any early returns)
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [showSizeGuide, setShowSizeGuide] = useState(false);
    const [selectedColor, setSelectedColor] = useState('');

    // Update selectedColor when product loads
    useEffect(() => {
        if (product?.colors?.[0]?.name) {
            setSelectedColor(product.colors[0].name);
        }
    }, [product]);

    // Inject structured data for SEO
    useEffect(() => {
        if (product) {
            const schema = generateProductSchema(product);
            injectStructuredData(schema);
            
            // Track product view
            trackProductView(product);
        }
    }, [product]);

    // Handle loading state
    if (isLoadingProduct) {
        return (
            <div className="page container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    // Handle missing product or error
    if (isError || !product) {
        return (
            <div className="page container" style={{ textAlign: 'center', padding: '100px 0' }}>
                <h2>Product Not Found</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                    The product you're looking for doesn't exist or has been removed.
                </p>
                <Link to="/products" className="btn btn--primary">Browse Products</Link>
            </div>
        );
    }

    const productReviews = allReviews.filter((r) => r.productId === product.id);

    const isWishlisted = wishlist.some((item) => item.id === product.id);

    const handleAddToCart = () => {
        if (!selectedSize && product.sizes.length > 0) {
            showToast('Please select a size', 'error');
            return;
        }
        const colorObj = product.colors.find(c => c.name === selectedColor) || { name: selectedColor };
        addToCart(product, selectedSize, colorObj, quantity);
    };

    return (
        <div className="page">
            <SEO 
                title={`${product.name} - ${product.brand} | Stryng Clothing`}
                description={product.description}
                keywords={`${product.name}, ${product.brand}, ${product.category}, streetwear, fashion`}
                image={product.images[0]}
                type="product"
            />
            <div className="container">
                {/* Breadcrumb */}
                <div className="breadcrumb">
                    <Link to="/" className="breadcrumb__link">Home</Link>
                    <span className="breadcrumb__separator"><ChevronRight size={14} /></span>
                    <Link to="/products" className="breadcrumb__link">Products</Link>
                    <span className="breadcrumb__separator"><ChevronRight size={14} /></span>
                    <span className="breadcrumb__current">{product.name}</span>
                </div>

                {/* PDP Main */}
                <div className="pdp">
                    {/* Gallery */}
                    <div className="pdp__gallery">
                        <div className="pdp__thumbnails">
                            {product.images?.map((img, i) => (
                                <button
                                    key={i}
                                    className={`pdp__thumbnail ${i === selectedImage ? 'pdp__thumbnail--active' : ''}`}
                                    onClick={() => setSelectedImage(i)}
                                >
                                    <img src={img} alt={`${product.name} view ${i + 1}`} />
                                </button>
                            ))}
                        </div>
                        <div className="pdp__main-image">
                            {product.images && product.images.length > 0 ? (
                                <img
                                    src={product.images[selectedImage]}
                                    alt={product.name}
                                    fetchPriority="high"
                                    loading="eager"
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="pdp__info">
                        <p className="pdp__brand">{product.brand}</p>
                        <h1 className="pdp__name">{product.name}</h1>

                        <div className="pdp__price-row">
                            <span className="pdp__price">{formatPrice(product.price)}</span>
                            {product.originalPrice > product.price && (
                                <>
                                    <span className="pdp__price--original">{formatPrice(product.originalPrice)}</span>
                                    <span className="pdp__price--discount">{product.discount}% OFF</span>
                                </>
                            )}
                        </div>

                        <div className="pdp__rating">
                            <StarRating rating={product.rating} />
                            <span>{product.rating}</span>
                            <span>({product.reviewCount} reviews)</span>
                        </div>

                        <p className="pdp__description">{product.description}</p>

                        {/* Color */}
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <p className="pdp__option-label">Color: <span style={{ fontWeight: 'var(--font-regular)', color: 'var(--color-text-muted)' }}>{selectedColor}</span></p>
                            <div className="pdp__colors">
                                {product.colors?.map((c) => (
                                    <button
                                        key={c.name}
                                        className={`pdp__color ${selectedColor === c.name ? 'pdp__color--active' : ''}`}
                                        style={{ backgroundColor: c.hex, border: c.hex === '#FFFFFF' ? '1px solid var(--color-border)' : 'none' }}
                                        onClick={() => setSelectedColor(c.name)}
                                        aria-label={c.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Size */}
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                <p className="pdp__option-label" style={{ marginBottom: 0 }}>
                                    Size: <span style={{ fontWeight: 'var(--font-regular)', color: 'var(--color-text-muted)' }}>{selectedSize || 'Select'}</span>
                                </p>
                                <button className="pdp__size-guide" onClick={() => setShowSizeGuide(true)}>Size Guide</button>
                            </div>
                            <div className="pdp__sizes">
                                {product.sizes?.map((s) => {
                                    const unavailable = product.unavailableSizes?.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            className={`pdp__size ${selectedSize === s ? 'pdp__size--active' : ''} ${unavailable ? 'pdp__size--unavailable' : ''}`}
                                            onClick={() => !unavailable && setSelectedSize(s)}
                                            disabled={unavailable}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quantity + Actions */}
                        <div className="pdp__actions">
                            <div className="qty-stepper">
                                <button className="qty-stepper__btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
                                <span className="qty-stepper__value">{quantity}</span>
                                <button className="qty-stepper__btn" onClick={() => setQuantity((q) => q + 1)}><Plus size={16} /></button>
                            </div>
                            <button
                                className="btn btn--primary pdp__add-to-cart btn--lg"
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag size={18} /> Add to Cart
                            </button>
                            <button
                                className={`pdp__wishlist-btn ${isWishlisted ? 'active' : ''}`}
                                aria-label="Add to wishlist"
                                onClick={() => toggleWishlist(product)}
                                style={{ color: isWishlisted ? 'var(--color-error)' : 'inherit', borderColor: isWishlisted ? 'var(--color-error)' : '' }}
                            >
                                <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        {/* Features */}
                        <div className="pdp__features">
                            <div className="pdp__feature">
                                <Truck size={22} className="pdp__feature-icon" />
                                <span className="pdp__feature-text">Free Shipping</span>
                            </div>
                            <div className="pdp__feature">
                                <RotateCcw size={22} className="pdp__feature-icon" />
                                <span className="pdp__feature-text">15-Day Returns</span>
                            </div>
                            <div className="pdp__feature">
                                <Shield size={22} className="pdp__feature-icon" />
                                <span className="pdp__feature-text">Genuine Product</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ marginTop: 'var(--space-16)' }}>
                    <div className="tabs">
                        {['description', 'reviews', 'size guide'].map((tab) => (
                            <button
                                key={tab}
                                className={`tabs__tab ${activeTab === tab ? 'tabs__tab--active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'description' && (
                        <div style={{ maxWidth: '700px' }}>
                            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                                {product.description}
                            </p>
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                                <li>• Fabric: {product.fabric}</li>
                                <li>• Regular fit</li>
                                <li>• Machine washable</li>
                                <li>• Imported</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div style={{ maxWidth: '700px' }}>
                            {productReviews.length > 0 ? (
                                productReviews.map((review) => (
                                    <div key={review.id} style={{ padding: 'var(--space-4) 0', borderBottom: 'var(--border-thin)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                                            <StarRating rating={review.rating} size={14} />
                                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{review.title}</span>
                                            {review.verified && <span className="badge badge--success">Verified</span>}
                                        </div>
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{review.comment}</p>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{review.user} — {review.date}</p>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: 'var(--color-text-muted)' }}>No reviews yet. Be the first to review this product!</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'size guide' && (
                        <div style={{ maxWidth: '500px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                                <thead>
                                    <tr>
                                        {sizeGuide.headers.map((h) => (
                                            <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: '2px solid var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sizeGuide.rows.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td key={j} style={{ padding: 'var(--space-3)', borderBottom: 'var(--border-thin)', color: 'var(--color-text-secondary)' }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Related Products */}
                <section className="section">
                    <div className="section__header">
                        <h2 className="section__title">You May Also Like</h2>
                    </div>
                    <div className="product-grid">
                        {relatedProducts.map((p) => (
                            <Link to={`/products/${p.slug}`} key={p.id} className="product-card">
                                <div className="product-card__image-wrapper">
                                    <img src={p.images[0]} alt={p.name} className="product-card__image" loading="lazy" />
                                </div>
                                <div className="product-card__info">
                                    <p className="product-card__brand">{p.brand}</p>
                                    <h3 className="product-card__name">{p.name}</h3>
                                    <div className="product-card__price">
                                        <span className="product-card__price--current">{formatPrice(p.price)}</span>
                                        {p.originalPrice > p.price && (
                                            <span className="product-card__price--original">{formatPrice(p.originalPrice)}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Size Guide Modal */}
                {showSizeGuide && (
                    <div className="modal-overlay" onClick={() => setShowSizeGuide(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal__header">
                                <h3 className="modal__title">Size Guide</h3>
                                <button onClick={() => setShowSizeGuide(false)} aria-label="Close">✕</button>
                            </div>
                            <div className="modal__body">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                                    <thead>
                                        <tr>
                                            {sizeGuide.headers.map((h) => (
                                                <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: '2px solid var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sizeGuide.rows.map((row, i) => (
                                            <tr key={i}>
                                                {row.map((cell, j) => (
                                                    <td key={j} style={{ padding: 'var(--space-3)', borderBottom: 'var(--border-thin)', color: 'var(--color-text-secondary)' }}>{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

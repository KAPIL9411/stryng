import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, ShoppingBag, Eye, ArrowRight, Star, Truck, RotateCcw, Shield } from 'lucide-react';
import { categories, formatPrice } from '../lib/dummyData';
import useStore from '../store/useStore';

/* ---- Hero Carousel (Marquee) ---- */
/* ---- Hero Carousel (Marquee) ---- */
function HeroBanner() {
    const { banners, fetchBanners, bannersLoaded } = useStore();

    useEffect(() => {
        fetchBanners();
    }, []);

    const activeBanners = banners.filter(b => b.active);

    // Logic: 
    // 1. If we have active banners from DB -> Use them.
    // 2. If we haven't loaded yet -> Use dummy data as placeholder? Or just wait?
    // User wants mock data GONE. So let's prioritize DB.

    let slidesToUse = [];

    if (bannersLoaded) {
        // DB check complete. Use ONLY DB data.
        slidesToUse = activeBanners;
    } else {
        // Still loading... optionally show dummy data or spinner. 
        // Let's show nothing to be safe and avoid "flicker" of mock data.
        slidesToUse = [];
    }

    if (slidesToUse.length === 0) {
        if (bannersLoaded) return null; // DB empty -> Hide section
        return null; // Loading -> Hide section
    }

    // Map dynamic banners to slide structure
    const formattedSlides = slidesToUse.map(b => ({
        id: b.id,
        image: b.image_url || b.image,
        title: b.title,
        tag: b.description || b.tag,
        link: b.cta_link || b.link
    }));

    // Duplicate slides to create seamless loop
    const marqueeSlides = [...formattedSlides, ...formattedSlides];

    if (marqueeSlides.length === 0) return null;

    return (
        <section className="hero-marquee">
            <div className="hero-marquee__track">
                {marqueeSlides.map((slide, index) => (
                    <div key={`${slide.id}-${index}`} className="hero-marquee__item">
                        <Link to={slide.link} className="hero-marquee__link">
                            <img src={slide.image} alt={slide.title} className="hero-marquee__image" />
                            <div className="hero-marquee__overlay">
                                <h2 className="hero-marquee__title">{slide.title}</h2>
                                <p className="hero-marquee__tag">{slide.tag}</p>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ---- Product Card ---- */
function ProductCard({ product }) {
    return (
        <Link to={`/products/${product.slug}`} className="product-card">
            <div className="product-card__image-wrapper">
                <img src={product.images[0]} alt={product.name} className="product-card__image" loading="lazy" />
                {product.images[1] && (
                    <img src={product.images[1]} alt={product.name} className="product-card__hover-image" loading="lazy" />
                )}

                <div className="product-card__badges">
                    {product.isNew && <span className="badge badge--new">New</span>}
                    {product.isTrending && <span className="badge badge--trending">Trending</span>}
                    {product.discount > 0 && <span className="badge badge--sale">-{product.discount}%</span>}
                </div>

                <div className="product-card__actions">
                    <button className="product-card__action-btn" aria-label="Add to wishlist" onClick={(e) => e.preventDefault()}>
                        <Heart size={16} />
                    </button>
                    <button className="product-card__action-btn" aria-label="Quick view" onClick={(e) => e.preventDefault()}>
                        <Eye size={16} />
                    </button>
                </div>

                <div className="product-card__quick-add" onClick={(e) => e.preventDefault()}>
                    <ShoppingBag size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Quick Add
                </div>
            </div>

            <div className="product-card__info">
                <p className="product-card__brand">{product.brand}</p>
                <h3 className="product-card__name">{product.name}</h3>
                <div className="product-card__price">
                    <span className="product-card__price--current">{formatPrice(product.price)}</span>
                    {product.originalPrice > product.price && (
                        <>
                            <span className="product-card__price--original">{formatPrice(product.originalPrice)}</span>
                            <span className="product-card__price--discount">({product.discount}% off)</span>
                        </>
                    )}
                </div>
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
            </div>
        </Link>
    );
}

/* ---- Category Cards ---- */
function CategorySection() {
    const { getCategoryCount } = useStore();

    // HARDCODED CATEGORIES
    // You can replace the 'image' URLs below with your own (e.g., "/images/my-shirt.jpg")
    const displayCategories = [
        {
            id: 1,
            name: 'T-Shirts',
            slug: 't-shirts',
            // plain white t-shirt mockup
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800"
        },
        {
            id: 2,
            name: 'Shirts',
            slug: 'shirts',
            // men's dress shirt
            image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=800"
        },
        {
            id: 3,
            name: 'Trousers',
            slug: 'trousers',
            // chino pants
            image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=800"
        }
    ];

    return (
        <section className="section">
            <div className="container">
                <div className="section__header">
                    <h2 className="section__title">Shop by Category</h2>
                    <p className="section__subtitle">Find exactly what you are looking for</p>
                </div>
                <div className="category-cards">
                    {displayCategories.map((cat) => (
                        <Link to={`/products?category=${cat.slug}`} key={cat.id} className="category-card">
                            <img src={cat.image} alt={cat.name} className="category-card__image" loading="lazy" />
                            <div className="category-card__overlay">
                                <h3 className="category-card__title">{cat.name}</h3>
                                <p className="category-card__count">{getCategoryCount(cat.slug)} Products</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ---- Trending Products (Marquee) ---- */
function TrendingProducts() {
    const { products } = useStore();
    // Get trending products or fallback to first 8 products if none marked trending
    const trending = products.filter((p) => p.isTrending);
    const displayProducts = trending.length > 0 ? trending : products.slice(0, 8);

    // Duplicate for seamless marquee if we have enough items
    const marqueeItems = displayProducts.length >= 4
        ? [...displayProducts, ...displayProducts]
        : displayProducts; // Don't marquee if too few items? Or duplicate more?

    // If extremely few items (e.g. 1-3), duplicate 4 times to fill screen
    const finalItems = displayProducts.length < 4
        ? [...displayProducts, ...displayProducts, ...displayProducts, ...displayProducts]
        : marqueeItems;

    return (
        <section className="section" style={{ backgroundColor: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
            <div className="container">
                <div className="section__header">
                    <h2 className="section__title">Trending Now</h2>
                    <p className="section__subtitle">The styles everyone is talking about</p>
                </div>
            </div>

            <div className="product-marquee">
                <div className="product-marquee__track">
                    {finalItems.map((product, index) => (
                        <div key={`${product.id}-${index}`} className="product-marquee__item">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="container" style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
                <Link to="/products" className="btn btn--secondary">Shop All Trending</Link>
            </div>
        </section>
    );
}

/* ---- New Arrivals Grid ---- */
function NewArrivals() {
    const { products } = useStore();
    const newItems = products.filter((p) => p.isNew).length > 0
        ? products.filter((p) => p.isNew)
        : products.slice(0, 4);
    return (
        <section className="section">
            <div className="container">
                <div className="section__header">
                    <h2 className="section__title">New Arrivals</h2>
                    <p className="section__subtitle">Fresh drops you don&apos;t want to miss</p>
                </div>
                <div className="product-grid">
                    {newItems.slice(0, 4).map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
                    <Link to="/products" className="btn btn--secondary">View All New Arrivals</Link>
                </div>
            </div>
        </section>
    );
}



/* ---- Features ---- */
function Features() {
    const feats = [
        { icon: <Truck strokeWidth={1.5} size={32} />, title: 'Free Shipping', desc: 'On orders above ₹999' },
        { icon: <RotateCcw strokeWidth={1.5} size={32} />, title: 'Easy Returns', desc: '15-day return policy' },
        { icon: <Shield strokeWidth={1.5} size={32} />, title: 'Secure Payments', desc: 'SSL encrypted checkout' },
        { icon: <Star strokeWidth={1.5} size={32} />, title: 'Premium Quality', desc: 'Curated fabrics & fits' },
    ];
    return (
        <section className="features-section">
            <div className="container">
                <div className="features-grid">
                    {feats.map((f, i) => (
                        <div key={f.title} className="feature-item">
                            <div className="feature-item__icon">{f.icon}</div>
                            <div className="feature-item__content">
                                <h4 className="feature-item__title">{f.title}</h4>
                                <p className="feature-item__desc">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ---- Newsletter ---- */
function Newsletter() {
    return (
        <section className="newsletter">
            <div className="container">
                <h2 className="newsletter__title">Stay in the Loop</h2>
                <p className="newsletter__text">
                    Subscribe to get exclusive offers, new arrival alerts, and style inspiration delivered to your inbox.
                </p>
                <form className="newsletter__form" onSubmit={(e) => e.preventDefault()}>
                    <input type="email" className="newsletter__input" placeholder="Enter your email address" />
                    <button type="submit" className="newsletter__btn">Subscribe</button>
                </form>
            </div>
        </section>
    );
}

/* ---- Manufacturing Process (Stryng Trust) ---- */
function ManufacturingProcess() {
    const steps = [
        {
            title: 'Design & Innovation',
            desc: 'Our oversized fits are conceptualized in-house, focusing on modern streetwear aesthetics.',
            // Fashion design studio / sketches
            img: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&q=80&w=800',
        },
        {
            title: 'Premium Production',
            desc: 'Crafted with high-GSM cotton blends. Every stitch is reinforced for durability.',
            // Sewing machine / craftsmanship
            img: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&q=80&w=800',
        },
        {
            title: 'Quality Assurance',
            desc: 'Rigorous quality checks to ensure every piece meets our "Stryng" standard.',
            // Checking fabric quality
            img: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&q=80&w=800',
        },
    ];

    return (
        <section className="process-section">
            <div className="container">
                <div className="section__header">
                    <h2 className="section__title">The Stryng Standard</h2>
                    <p className="section__subtitle">How we create your favorite fits</p>
                </div>
                <div className="process-grid">
                    {steps.map((step, index) => (
                        <div key={index} className="process-card">
                            <div className="process-card__image-wrapper">
                                <img src={step.img} alt={step.title} className="process-card__image" loading="lazy" />
                            </div>
                            <h3 className="h4" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>{step.title}</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ---- Value Proposition (Premium Low Cost) ---- */
function ValueProposition() {
    return (
        <section className="value-prop">
            <div className="container">
                <div className="value-prop__grid">
                    <div className="value-prop__content">
                        <span className="value-prop__label">Why Choose Us</span>
                        <h2 className="value-prop__title">Luxury Quality.<br />Honest Prices.</h2>
                        <p className="value-prop__description">
                            We believe premium fashion shouldn't come with a premium price tag.
                            By cutting out the middlemen and manufacturing directly, we bring you
                            high-end fabrics and expert craftsmanship at a fraction of the cost.
                        </p>
                        <ul className="value-prop__list">
                            <li className="value-prop__item">
                                <span className="value-prop__check">✓</span> Direct-to-Consumer Savings
                            </li>
                            <li className="value-prop__item">
                                <span className="value-prop__check">✓</span> High-GSM Premium Cotton
                            </li>
                            <li className="value-prop__item">
                                <span className="value-prop__check">✓</span> Ethical Manufacturing
                            </li>
                        </ul>
                        <Link to="/products" className="btn btn--primary btn--lg" style={{ marginTop: 'var(--space-8)' }}>
                            Experience the Quality
                        </Link>
                    </div>
                    <div className="value-prop__image-wrapper">
                        <img
                            src="/images/3.png"
                            alt="Premium Streetwear Model"
                            className="value-prop__image"
                        />
                        <div className="value-prop__badge">
                            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold' }}>50%</span>
                            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Less Cost</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ---- Home Page ---- */
export default function Home() {
    const { fetchProducts, fetchBanners } = useStore();

    useEffect(() => {
        fetchProducts();
        fetchBanners();
    }, []);

    return (
        <>
            <HeroBanner />
            <Features />
            <CategorySection />
            <TrendingProducts />
            <ValueProposition />
            <NewArrivals />
            <ManufacturingProcess />
            <Newsletter />
        </>
    );
}

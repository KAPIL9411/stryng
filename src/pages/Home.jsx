import { useState, useEffect, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Eye,
  Star,
  Truck,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import SEO from '../components/SEO';
import { useBanners } from '../hooks/useBanners';
import { useAllProducts } from '../hooks/useProducts';
import { getStockStatus } from '../lib/inventory';

/* ---- Hero Carousel (Marquee) - OPTIMIZED ---- */
const HeroBanner = memo(function HeroBanner() {
  const { data: banners = [], isLoading, error } = useBanners();
  const activeBanners = useMemo(() => banners.filter((b) => b.active), [banners]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Touch swipe state
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Map dynamic banners to slide structure - memoize to prevent recalculation
  const formattedSlides = useMemo(() => activeBanners.map((b) => ({
    id: b.id,
    image: b.image_url || b.image,
    link: b.cta_link || b.link,
    title: b.title,
  })), [activeBanners]);

  // Duplicate slides to create seamless loop for desktop
  const marqueeSlides = useMemo(() => [...formattedSlides, ...formattedSlides], [formattedSlides]);

  // Handle window resize with debounce
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Auto-advance slides on mobile
  useEffect(() => {
    if (!isMobile || activeBanners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isMobile, activeBanners.length]);

  // Preload first image immediately
  useEffect(() => {
    if (formattedSlides.length > 0) {
      const img = new Image();
      img.src = formattedSlides[0].image;
      img.onload = () => setImagesLoaded(true);
      
      // Preload second image for smoother experience
      if (formattedSlides.length > 1) {
        const img2 = new Image();
        img2.src = formattedSlides[1].image;
      }
    }
  }, [formattedSlides]);

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const swipeDistance = touchStart - touchEnd;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    if (swipeDistance > 0) {
      // Swiped left - next slide
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    } else {
      // Swiped right - previous slide
      setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    }
  };

  // Show minimal skeleton loader during initial load
  if (isLoading || !imagesLoaded) {
    return (
      <section className="hero-marquee" style={{ minHeight: isMobile ? '400px' : '600px', backgroundColor: '#f5f5f5' }}>
        <div style={{ 
          width: '100%', 
          height: '100%', 
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </section>
    );
  }

  // Show error if fetch failed
  if (error) {
    console.error('❌ Error loading banners:', error);
    return (
      <section
        className="hero-marquee"
        style={{
          minHeight: '300px',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Unable to load banners
          </p>
        </div>
      </section>
    );
  }

  // After load, hide if no banners
  if (activeBanners.length === 0) {
    console.warn('⚠️ No active banners found');
    return (
      <section
        className="hero-marquee"
        style={{
          minHeight: '300px',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No banners available
          </p>
          <small style={{ color: 'var(--color-text-muted)' }}>
            Add banners from the admin panel
          </small>
        </div>
      </section>
    );
  }

  // Mobile carousel view
  if (isMobile) {
    return (
      <section 
        className="hero-carousel-mobile"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="hero-carousel-mobile__container"
          style={{ 
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {formattedSlides.map((slide, index) => (
            <div key={slide.id} className="hero-carousel-mobile__slide">
              <Link to={slide.link} className="hero-carousel-mobile__link">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="hero-carousel-mobile__image"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  draggable="false"
                />
              </Link>
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        {formattedSlides.length > 1 && (
          <div className="hero-carousel-mobile__dots">
            {formattedSlides.map((_, index) => (
              <button
                key={index}
                className={`hero-carousel-mobile__dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  // Desktop marquee view
  return (
    <section className="hero-marquee">
      <div className="hero-marquee__track">
        {marqueeSlides.map((slide, index) => (
          <div key={`${slide.id}-${index}`} className="hero-marquee__item">
            <Link to={slide.link} className="hero-marquee__link">
              <img
                src={slide.image}
                alt={slide.title}
                className="hero-marquee__image"
                width="600"
                height="800"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "low"}
                decoding="async"
              />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
});

/* ---- Product Card ---- */
const ProductCard = memo(function ProductCard({ product }) {
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
        <img
          src={product.images[0]}
          alt={product.name}
          className="product-card__image"
          loading="lazy"
          width="300"
          height="400"
          style={{ filter: isOutOfStock ? 'grayscale(50%)' : 'none' }}
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={product.name}
            className="product-card__hover-image"
            loading="lazy"
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
            aria-label="Add to wishlist"
            onClick={(e) => e.preventDefault()}
          >
            <Heart size={16} />
          </button>
          <button
            className="product-card__action-btn"
            aria-label="Quick view"
            onClick={(e) => e.preventDefault()}
          >
            <Eye size={16} />
          </button>
        </div>

        {!isOutOfStock && (
          <div
            className="product-card__quick-add"
            onClick={(e) => e.preventDefault()}
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
});

/* ---- Category Cards ---- */
const CategorySection = memo(function CategorySection() {
  const { data: products = [] } = useAllProducts();

  const getCategoryCount = (categorySlug) => {
    return products.filter((p) => p.category === categorySlug).length;
  };

  // Categories with local images
  const displayCategories = [
    {
      id: 1,
      name: 'T-Shirts',
      slug: 't-shirts',
      image: '/images/tshirts.webp',
    },
    {
      id: 2,
      name: 'Shirts',
      slug: 'shirts',
      image: '/images/shirts.webp',
    },
    {
      id: 3,
      name: 'Trousers',
      slug: 'trousers',
      image: '/images/trousers.webp',
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">Shop by Category</h2>
          <p className="section__subtitle">
            Find exactly what you are looking for
          </p>
        </div>
        <div className="category-cards">
          {displayCategories.map((cat) => (
            <Link
              to={`/products?category=${cat.slug}`}
              key={cat.id}
              className="category-card"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="category-card__image"
                loading="lazy"
                width="400"
                height="500"
              />
              <div className="category-card__overlay">
                <h3 className="category-card__title">{cat.name}</h3>
                <p className="category-card__count">
                  {getCategoryCount(cat.slug)} Products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ---- Trending Products (Marquee) ---- */
const TrendingProducts = memo(function TrendingProducts() {
  const { data: products = [], isLoading } = useAllProducts();

  // Get trending products or fallback to first 8 products if none marked trending - memoize
  const displayProducts = useMemo(() => {
    const trending = products.filter((p) => p.isTrending);
    return trending.length > 0 ? trending : products.slice(0, 8);
  }, [products]);

  // Duplicate for seamless marquee if we have enough items - memoize
  const finalItems = useMemo(() => {
    const marqueeItems =
      displayProducts.length >= 4
        ? [...displayProducts, ...displayProducts]
        : displayProducts;

    // If extremely few items (e.g. 1-3), duplicate 4 times to fill screen
    return displayProducts.length < 4
      ? [
          ...displayProducts,
          ...displayProducts,
          ...displayProducts,
          ...displayProducts,
        ]
      : marqueeItems;
  }, [displayProducts]);

  if (isLoading) {
    return (
      <section
        className="section"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          overflow: 'hidden',
        }}
      >
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Trending Now</h2>
            <p className="section__subtitle">
              The styles everyone is talking about
            </p>
          </div>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="section"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">Trending Now</h2>
          <p className="section__subtitle">
            The styles everyone is talking about
          </p>
        </div>
      </div>

      <div className="product-marquee">
        <div className="product-marquee__track">
          {finalItems.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              className="product-marquee__item"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <div
        className="container"
        style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}
      >
        <Link to="/products" className="btn btn--secondary">
          Shop All Trending
        </Link>
      </div>
    </section>
  );
});

/* ---- New Arrivals Grid ---- */
const NewArrivals = memo(function NewArrivals() {
  const { data: products = [], isLoading } = useAllProducts();

  // Memoize filtered new items
  const newItems = useMemo(() => {
    const filtered = products.filter((p) => p.isNew);
    return filtered.length > 0 ? filtered : products.slice(0, 4);
  }, [products]);

  if (isLoading) {
    return (
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">New Arrivals</h2>
            <p className="section__subtitle">
              Fresh drops you don&apos;t want to miss
            </p>
          </div>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">New Arrivals</h2>
          <p className="section__subtitle">
            Fresh drops you don&apos;t want to miss
          </p>
        </div>
        <div className="product-grid">
          {newItems.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <Link to="/products" className="btn btn--secondary">
            View All New Arrivals
          </Link>
        </div>
      </div>
    </section>
  );
});

/* ---- Features ---- */
const Features = memo(function Features() {
  const feats = [
    {
      icon: <Truck strokeWidth={1.5} size={32} />,
      title: 'Free Shipping',
      desc: 'On orders above ₹999',
    },
    {
      icon: <RotateCcw strokeWidth={1.5} size={32} />,
      title: 'Easy Returns',
      desc: '15-day return policy',
    },
    {
      icon: <Shield strokeWidth={1.5} size={32} />,
      title: 'Secure Payments',
      desc: 'SSL encrypted checkout',
    },
    {
      icon: <Star strokeWidth={1.5} size={32} />,
      title: 'Premium Quality',
      desc: 'Curated fabrics & fits',
    },
  ];
  return (
    <section className="features-section">
      <div className="container">
        <div className="features-grid">
          {feats.map((f) => (
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
});

/* ---- Manufacturing Process (Stryng Trust) ---- */
const ManufacturingProcess = memo(function ManufacturingProcess() {
  const steps = [
    {
      title: 'Design & Innovation',
      desc: 'Our oversized fits are conceptualized in-house, focusing on modern streetwear aesthetics.',
      img: '/images/process1.webp',
    },
    {
      title: 'Premium Production',
      desc: 'Crafted with high-GSM cotton blends. Every stitch is reinforced for durability.',
      img: '/images/process2.webp',
    },
    {
      title: 'Quality Assurance',
      desc: 'Rigorous quality checks to ensure every piece meets our "Stryng" standard.',
      img: '/images/process3.webp',
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
                <img
                  src={step.img}
                  alt={step.title}
                  className="process-card__image"
                  loading="lazy"
                  width="600"
                  height="400"
                />
              </div>
              <h3
                className="h4"
                style={{
                  marginTop: 'var(--space-4)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ---- Value Proposition (Premium Low Cost) ---- */
const ValueProposition = memo(function ValueProposition() {
  return (
    <section className="value-prop">
      <div className="container">
        <div className="value-prop__grid">
          <div className="value-prop__content">
            <span className="value-prop__label">Why Choose Us</span>
            <h2 className="value-prop__title">
              Luxury Quality.
              <br />
              Honest Prices.
            </h2>
            <p className="value-prop__description">
              We believe premium fashion shouldn't come with a premium price
              tag. By cutting out the middlemen and manufacturing directly, we
              bring you high-end fabrics and expert craftsmanship at a fraction
              of the cost.
            </p>
            <ul className="value-prop__list">
              <li className="value-prop__item">
                <span className="value-prop__check">✓</span> Direct-to-Consumer
                Savings
              </li>
              <li className="value-prop__item">
                <span className="value-prop__check">✓</span> High-GSM Premium
                Cotton
              </li>
              <li className="value-prop__item">
                <span className="value-prop__check">✓</span> Ethical
                Manufacturing
              </li>
            </ul>
            <Link
              to="/products"
              className="btn btn--primary btn--lg"
              style={{ marginTop: 'var(--space-8)' }}
            >
              Experience the Quality
            </Link>
          </div>
          <div className="value-prop__image-wrapper">
            <img
              src="/images/3.webp"
              alt="Premium Streetwear Model"
              className="value-prop__image"
              width="600"
              height="750"
            />
            <div className="value-prop__badge">
              <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold' }}>
                50%
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                }}
              >
                Less Cost
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

/* ---- Home Page ---- */
export default function Home() {
  return (
    <>
      <SEO
        title="Stryng Clothing - Premium Streetwear & Fashion"
        description="Shop premium quality streetwear, t-shirts, shirts, and trousers. Direct-to-consumer pricing with luxury quality. Free shipping on orders above ₹999."
        keywords="streetwear, fashion, clothing, t-shirts, shirts, trousers, premium clothing, online shopping, India"
      />
      <HeroBanner />
      <Features />
      <CategorySection />
      <TrendingProducts />
      <ValueProposition />
      <NewArrivals />
      <ManufacturingProcess />
    </>
  );
}
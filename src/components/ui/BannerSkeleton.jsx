/**
 * BannerSkeleton Component
 * Displays a loading skeleton for hero banners
 * Uses the same style as ProductSkeleton for consistency
 */

export default function BannerSkeleton({ isMobile = false }) {
  if (isMobile) {
    return (
      <section className="hero-carousel-mobile">
        <div className="hero-carousel-mobile__container">
          <div className="hero-carousel-mobile__slide">
            <div className="skeleton__image" style={{ width: '100%', height: '400px', borderRadius: 0 }}>
              <div className="skeleton__shimmer" />
            </div>
          </div>
        </div>
        <div className="hero-carousel-mobile__dots">
          <span className="skeleton__color-dot" />
          <span className="skeleton__color-dot" />
          <span className="skeleton__color-dot" />
        </div>
      </section>
    );
  }

  return (
    <section className="hero-marquee" style={{ minHeight: '600px', overflow: 'hidden' }}>
      <div className="hero-marquee__track" style={{ animation: 'none' }}>
        <div className="hero-marquee__item">
          <div className="skeleton__image" style={{ width: '600px', height: '800px', borderRadius: 0 }}>
            <div className="skeleton__shimmer" />
          </div>
        </div>
        <div className="hero-marquee__item">
          <div className="skeleton__image" style={{ width: '600px', height: '800px', borderRadius: 0 }}>
            <div className="skeleton__shimmer" />
          </div>
        </div>
        <div className="hero-marquee__item">
          <div className="skeleton__image" style={{ width: '600px', height: '800px', borderRadius: 0 }}>
            <div className="skeleton__shimmer" />
          </div>
        </div>
      </div>
    </section>
  );
}

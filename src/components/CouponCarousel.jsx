import { useState, useEffect, memo, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { getActiveCoupons } from '../api/coupons.api';
import '../styles/coupon-carousel.css';

const CouponCarousel = memo(function CouponCarousel() {
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      console.log('🎫 CouponCarousel: Loading coupons...');
      const activeCoupons = await getActiveCoupons();
      console.log('🎫 CouponCarousel: Loaded coupons:', activeCoupons);
      setCoupons(activeCoupons);
    } catch (error) {
      console.error('🎫 CouponCarousel: Error loading coupons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-advance slides
  useEffect(() => {
    if (coupons.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % coupons.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [coupons.length]);

  // Close tooltip when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (window.innerWidth <= 768) {
          setShowTooltip(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleStickerClick = () => {
    // Toggle tooltip on click for mobile devices
    setShowTooltip(!showTooltip);
  };

  const handleStickerMouseEnter = () => {
    // Only show on hover for desktop
    if (window.innerWidth > 768) {
      setShowTooltip(true);
    }
  };

  const handleStickerMouseLeave = () => {
    // Only hide on mouse leave for desktop
    if (window.innerWidth > 768) {
      setShowTooltip(false);
    }
  };

  const getDiscountText = (coupon) => {
    const discountType = coupon.discountType || 'percentage';
    const discountValue = coupon.discountValue || 0;
    
    if (discountType === 'percentage') {
      // Round to whole number for cleaner display
      return `${Math.round(discountValue)}%`;
    } else {
      return `₹${Math.round(discountValue)}`;
    }
  };

  // Color schemes for different coupons
  const colorSchemes = [
    { name: 'green', gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)' },
    { name: 'blue', gradient: 'linear-gradient(135deg, #1976D2 0%, #0D47A1 100%)' },
    { name: 'purple', gradient: 'linear-gradient(135deg, #7B1FA2 0%, #4A148C 100%)' },
    { name: 'orange', gradient: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)' },
    { name: 'red', gradient: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)' },
  ];

  const getCurrentColor = () => {
    return colorSchemes[currentSlide % colorSchemes.length];
  };

  if (isLoading || coupons.length === 0) {
    return null;
  }

  const currentCoupon = coupons[currentSlide];
  const currentColor = getCurrentColor();

  return (
    <div className="coupon-sticker-container" ref={containerRef}>
      <div 
        className="coupon-sticker"
        onClick={handleStickerClick}
        onMouseEnter={handleStickerMouseEnter}
        onMouseLeave={handleStickerMouseLeave}
      >
        {/* Discount badge with dynamic color */}
        <div 
          className="coupon-sticker__badge"
          style={{ background: currentColor.gradient }}
        >
          <div className="coupon-sticker__badge-label">SPECIAL OFFER</div>
          <div className="coupon-sticker__badge-title">DISCOUNT</div>
          <div className="coupon-sticker__badge-subtitle">WARRANTY LOW PRICE</div>
        </div>

        {/* White percentage section */}
        <div className="coupon-sticker__value">
          <div className="coupon-sticker__value-label">UP TO</div>
          <div className="coupon-sticker__value-number">{getDiscountText(currentCoupon)}</div>
          <div className="coupon-sticker__value-off">OFF</div>
        </div>

        {/* Peel effect */}
        <div className="coupon-sticker__peel"></div>
      </div>

      {/* Tooltip with coupon details - separate from sticker so it doesn't disappear */}
      {showTooltip && (
        <div 
          className="coupon-sticker__tooltip"
          onMouseEnter={handleStickerMouseEnter}
          onMouseLeave={handleStickerMouseLeave}
        >
          <div className="coupon-sticker__tooltip-content">
            <h4>{currentCoupon.name || currentCoupon.code}</h4>
            <p>{currentCoupon.description || 'Use this coupon to get amazing discounts'}</p>
            <div className="coupon-sticker__tooltip-code">
              <code>{currentCoupon.code}</code>
              <button
                onClick={() => copyToClipboard(currentCoupon.code)}
                className="coupon-sticker__tooltip-copy"
              >
                {copiedCode === currentCoupon.code ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation dots */}
      {coupons.length > 1 && (
        <div className="coupon-sticker__dots">
          {coupons.map((_, index) => (
            <button
              key={index}
              className={`coupon-sticker__dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to coupon ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default CouponCarousel;

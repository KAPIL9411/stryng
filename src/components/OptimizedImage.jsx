import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ImageOptimizer from '../utils/imageOptimizer';

/**
 * OptimizedImage component with lazy loading and responsive images
 * 
 * Features:
 * - Automatic WebP conversion
 * - Responsive srcset generation
 * - Lazy loading with Intersection Observer
 * - Configurable presets for different use cases
 */
function OptimizedImage({
  src,
  alt,
  preset = 'card',
  width,
  className = '',
  eager = false,
  onLoad,
  ...props
}) {
  const imgRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(eager);
  const [hasError, setHasError] = useState(false);

  // Get preset configuration or use custom width
  const config = width 
    ? { width, quality: 'auto', crop: 'fill', format: 'webp' }
    : ImageOptimizer.getPreset(preset);

  // Generate optimized URLs
  const optimizedSrc = ImageOptimizer.getResponsiveUrl(src, config.width, config);
  const srcSet = ImageOptimizer.generateSrcSet(src, undefined, config);
  const sizes = ImageOptimizer.generateSizes();

  useEffect(() => {
    if (eager || !imgRef.current) return;

    // Set up lazy loading
    const element = imgRef.current;
    const observerOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01
    };

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [eager]);

  const handleLoad = () => {
    if (onLoad) {
      onLoad();
    }
  };

  const handleError = () => {
    setHasError(true);
    console.error(`Failed to load image: ${src}`);
  };

  // Placeholder while loading
  const placeholderStyle = {
    backgroundColor: '#f0f0f0',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (hasError) {
    return (
      <div 
        className={`image-error ${className}`}
        style={placeholderStyle}
        role="img"
        aria-label={alt}
      >
        <span>Image failed to load</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={isLoaded ? optimizedSrc : undefined}
      srcSet={isLoaded ? srcSet : undefined}
      sizes={isLoaded ? sizes : undefined}
      alt={alt}
      className={`optimized-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      loading={eager ? 'eager' : 'lazy'}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
}

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  preset: PropTypes.oneOf(['thumbnail', 'card', 'hero', 'gallery']),
  width: PropTypes.number,
  className: PropTypes.string,
  eager: PropTypes.bool,
  onLoad: PropTypes.func
};

export default OptimizedImage;

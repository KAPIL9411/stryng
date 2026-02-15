/**
 * Image Optimization Utilities
 * Provides functions for optimizing images using Cloudinary transformations
 * and generating responsive image attributes
 */

/**
 * Get optimized image URL with Cloudinary transformations
 * @param {string} url - Original image URL
 * @param {Object} options - Optimization options
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (url, options = {}) => {
  if (!url) return '';

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = options;

  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
    // Build transformation string
    const transformations = [];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);
    if (crop) transformations.push(`c_${crop}`);
    if (gravity) transformations.push(`g_${gravity}`);

    const transformString = transformations.join(',');

    // Insert transformations into URL
    return url.replace('/upload/', `/upload/${transformString}/`);
  }

  // For non-Cloudinary URLs, return as-is
  // In production, you might want to proxy these through your CDN
  return url;
};

/**
 * Generate srcSet for responsive images
 * @param {string} url - Original image URL
 * @param {Array<number>} widths - Array of widths to generate
 * @returns {string} srcSet string
 */
export const generateSrcSet = (url, widths = [200, 400, 800, 1200]) => {
  if (!url) return '';

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { width })} ${width}w`)
    .join(', ');
};

/**
 * Generate sizes attribute for responsive images
 * @param {Object} breakpoints - Breakpoint configuration
 * @returns {string} sizes string
 */
export const generateSizes = (breakpoints = {}) => {
  const defaultBreakpoints = {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '400px',
    ...breakpoints,
  };

  return `(max-width: 768px) ${defaultBreakpoints.mobile}, (max-width: 1024px) ${defaultBreakpoints.tablet}, ${defaultBreakpoints.desktop}`;
};

/**
 * Get thumbnail URL (small, optimized for cards)
 * @param {string} url - Original image URL
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (url) => {
  return getOptimizedImageUrl(url, {
    width: 400,
    height: 500,
    quality: 'auto:good',
    crop: 'fill',
  });
};

/**
 * Get product card image attributes
 * @param {string} url - Original image URL
 * @returns {Object} Image attributes for product cards
 */
export const getProductCardImageProps = (url) => {
  return {
    src: getThumbnailUrl(url),
    srcSet: generateSrcSet(url, [200, 400, 600]),
    sizes: generateSizes({ mobile: '50vw', tablet: '33vw', desktop: '300px' }),
    loading: 'lazy',
    decoding: 'async',
  };
};

/**
 * Get hero/banner image attributes
 * @param {string} url - Original image URL
 * @returns {Object} Image attributes for hero/banner images
 */
export const getHeroImageProps = (url) => {
  return {
    src: getOptimizedImageUrl(url, { width: 1200, quality: 'auto:best' }),
    srcSet: generateSrcSet(url, [600, 1200, 1800, 2400]),
    sizes: '100vw',
    loading: 'eager',
    fetchPriority: 'high',
    decoding: 'async',
  };
};

/**
 * Get product detail image attributes
 * @param {string} url - Original image URL
 * @returns {Object} Image attributes for product detail pages
 */
export const getProductDetailImageProps = (url) => {
  return {
    src: getOptimizedImageUrl(url, { width: 800, quality: 'auto:best' }),
    srcSet: generateSrcSet(url, [400, 800, 1200]),
    sizes: generateSizes({ mobile: '100vw', tablet: '60vw', desktop: '600px' }),
    loading: 'eager',
    fetchPriority: 'high',
    decoding: 'async',
  };
};

/**
 * Preload critical images
 * @param {Array<string>} urls - Array of image URLs to preload
 */
export const preloadImages = (urls) => {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getOptimizedImageUrl(url, { width: 800 });
    document.head.appendChild(link);
  });
};

/**
 * Generate blur placeholder data URL
 * @param {number} width - Placeholder width
 * @param {number} height - Placeholder height
 * @param {string} color - Placeholder color
 * @returns {string} Data URL for blur placeholder
 */
export const generateBlurPlaceholder = (
  width = 10,
  height = 10,
  color = '#f0f0f0'
) => {
  // Create a tiny SVG as placeholder
  const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${width}" height="${height}" fill="${color}"/>
        </svg>
    `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Lazy load image with Intersection Observer
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source URL
 */
export const lazyLoadImage = (img, src) => {
  if (!img || !src) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            img.src = src;
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = src;
  }
};

/**
 * Get optimized image for different contexts
 * @param {string} url - Original image URL
 * @param {string} context - Context: 'card', 'hero', 'detail', 'thumbnail'
 * @returns {Object} Optimized image props
 */
export const getOptimizedImage = (url, context = 'card') => {
  const contexts = {
    card: getProductCardImageProps,
    hero: getHeroImageProps,
    detail: getProductDetailImageProps,
    thumbnail: (url) => ({ src: getThumbnailUrl(url), loading: 'lazy' }),
  };

  const getProps = contexts[context] || contexts.card;
  return getProps(url);
};

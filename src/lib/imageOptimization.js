/**
 * Image Optimization Utilities
 * Cloudinary auto-optimization for faster image loading
 * FREE solution - 3-5x faster image loading
 * @module lib/imageOptimization
 */

/**
 * Optimize Cloudinary image URL with auto-format and auto-quality
 * @param {string} url - Original image URL
 * @param {Object} options - Optimization options
 * @returns {string} Optimized image URL
 */
export function optimizeImage(url, options = {}) {
  if (!url) return '';
  
  // Only optimize Cloudinary URLs
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const {
    width = null,
    height = null,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
    blur = false,
    placeholder = false,
  } = options;

  // Build transformation string
  const transformations = [];

  // Auto format (WebP for modern browsers, fallback to original)
  transformations.push(`f_${format}`);

  // Auto quality (optimal compression)
  transformations.push(`q_${quality}`);

  // Dimensions
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);

  // Cropping
  if (crop) transformations.push(`c_${crop}`);

  // Smart cropping (focus on important parts)
  if (gravity) transformations.push(`g_${gravity}`);

  // Blur for placeholder
  if (blur) transformations.push('e_blur:1000');
  if (placeholder) transformations.push('q_1,w_20');

  const transformation = transformations.join(',');

  // Insert transformation into URL
  return url.replace('/upload/', `/upload/${transformation}/`);
}

/**
 * Get responsive image URLs for different screen sizes
 * @param {string} url - Original image URL
 * @returns {Object} Responsive image URLs
 */
export function getResponsiveImages(url) {
  return {
    mobile: optimizeImage(url, { width: 400 }),
    tablet: optimizeImage(url, { width: 800 }),
    desktop: optimizeImage(url, { width: 1200 }),
    thumbnail: optimizeImage(url, { width: 200, height: 200, crop: 'thumb' }),
    placeholder: optimizeImage(url, { placeholder: true }),
  };
}

/**
 * Generate srcset for responsive images
 * @param {string} url - Original image URL
 * @param {Array} widths - Array of widths
 * @returns {string} srcset string
 */
export function generateSrcSet(url, widths = [400, 800, 1200, 1600]) {
  return widths
    .map(width => `${optimizeImage(url, { width })} ${width}w`)
    .join(', ');
}

/**
 * Preload critical images
 * @param {Array} urls - Array of image URLs to preload
 */
export function preloadImages(urls) {
  if (!urls || urls.length === 0) return;

  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizeImage(url, { width: 800 });
    document.head.appendChild(link);
  });
}

/**
 * Lazy load images with Intersection Observer
 * @param {string} selector - CSS selector for images
 */
export function lazyLoadImages(selector = 'img[data-src]') {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          if (src) {
            img.src = optimizeImage(src, { width: 800 });
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers without Intersection Observer
    document.querySelectorAll(selector).forEach(img => {
      const src = img.dataset.src;
      if (src) {
        img.src = optimizeImage(src, { width: 800 });
        img.removeAttribute('data-src');
      }
    });
  }
}

/**
 * Get blur placeholder data URL
 * @param {string} url - Original image URL
 * @returns {Promise<string>} Base64 data URL
 */
export async function getBlurPlaceholder(url) {
  try {
    const placeholderUrl = optimizeImage(url, { placeholder: true });
    const response = await fetch(placeholderUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error generating blur placeholder:', error);
    return '';
  }
}

/**
 * Optimize product images
 * @param {Array} images - Array of image URLs
 * @returns {Array} Optimized image URLs
 */
export function optimizeProductImages(images) {
  if (!Array.isArray(images)) return [];
  
  return images.map(url => optimizeImage(url, {
    width: 800,
    quality: 'auto:good',
    format: 'auto',
  }));
}

/**
 * Optimize banner images
 * @param {string} url - Banner image URL
 * @param {boolean} isMobile - Is mobile device
 * @returns {string} Optimized banner URL
 */
export function optimizeBannerImage(url, isMobile = false) {
  return optimizeImage(url, {
    width: isMobile ? 800 : 1920,
    quality: 'auto:good',
    format: 'auto',
    crop: 'fill',
    gravity: 'auto',
  });
}

/**
 * Optimize thumbnail images
 * @param {string} url - Original image URL
 * @returns {string} Optimized thumbnail URL
 */
export function optimizeThumbnail(url) {
  return optimizeImage(url, {
    width: 200,
    height: 200,
    crop: 'thumb',
    gravity: 'auto',
    quality: 'auto:good',
  });
}

/**
 * Check if image is from Cloudinary
 * @param {string} url - Image URL
 * @returns {boolean} Is Cloudinary image
 */
export function isCloudinaryImage(url) {
  return url && url.includes('cloudinary.com');
}

/**
 * Get image dimensions from Cloudinary URL
 * @param {string} url - Cloudinary image URL
 * @returns {Object} Width and height
 */
export function getImageDimensions(url) {
  if (!isCloudinaryImage(url)) {
    return { width: null, height: null };
  }

  const widthMatch = url.match(/w_(\d+)/);
  const heightMatch = url.match(/h_(\d+)/);

  return {
    width: widthMatch ? parseInt(widthMatch[1]) : null,
    height: heightMatch ? parseInt(heightMatch[1]) : null,
  };
}

/**
 * Progressive image loading component helper
 * @param {string} url - Original image URL
 * @returns {Object} URLs for progressive loading
 */
export function getProgressiveImageUrls(url) {
  return {
    placeholder: optimizeImage(url, { placeholder: true, blur: true }),
    lowQuality: optimizeImage(url, { width: 400, quality: 'auto:low' }),
    mediumQuality: optimizeImage(url, { width: 800, quality: 'auto:good' }),
    highQuality: optimizeImage(url, { width: 1200, quality: 'auto:best' }),
  };
}

export default {
  optimizeImage,
  getResponsiveImages,
  generateSrcSet,
  preloadImages,
  lazyLoadImages,
  getBlurPlaceholder,
  optimizeProductImages,
  optimizeBannerImage,
  optimizeThumbnail,
  isCloudinaryImage,
  getImageDimensions,
  getProgressiveImageUrls,
};

/**
 * Image Optimization Utilities
 * Generates optimized Cloudinary URLs for different use cases
 */

/**
 * Generate low-quality image placeholder (LQIP) from Cloudinary URL
 * @param {string} imageUrl - Original Cloudinary image URL
 * @returns {string} - Low-quality placeholder URL
 */
export const getLQIP = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }

  // Insert quality and size transformations before /upload/
  return imageUrl.replace(
    '/upload/',
    '/upload/q_10,w_50,e_blur:1000/'
  );
};

/**
 * Generate optimized image URL for banners
 * @param {string} imageUrl - Original Cloudinary image URL
 * @param {object} options - Optimization options
 * @returns {string} - Optimized image URL
 */
export const getOptimizedBannerUrl = (imageUrl, options = {}) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }

  const {
    width = 800,
    quality = 'auto',
    format = 'auto',
  } = options;

  return imageUrl.replace(
    '/upload/',
    `/upload/w_${width},q_${quality},f_${format}/`
  );
};

/**
 * Generate responsive image srcset for banners
 * @param {string} imageUrl - Original Cloudinary image URL
 * @returns {string} - srcset string
 */
export const getBannerSrcSet = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return '';
  }

  const widths = [400, 600, 800, 1200];
  return widths
    .map(w => `${getOptimizedBannerUrl(imageUrl, { width: w })} ${w}w`)
    .join(', ');
};

/**
 * Preload critical images
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

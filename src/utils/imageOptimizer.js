/**
 * Image Optimization Utility for Cloudinary
 * 
 * Provides utilities for:
 * - Generating responsive image URLs with width parameters
 * - Converting images to WebP format
 * - Implementing lazy loading with Intersection Observer
 * - Generating srcset for responsive images
 */

import { useState, useEffect } from 'react';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Standard responsive image widths for different breakpoints
 */
const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1536];

/**
 * ImageOptimizer class for Cloudinary image optimization
 */
class ImageOptimizer {
  /**
   * Generate a responsive image URL with specified width and format
   * @param {string} imageId - Cloudinary public ID or full URL
   * @param {number} width - Desired width in pixels
   * @param {Object} options - Additional options
   * @param {string} options.format - Image format (default: 'webp')
   * @param {string} options.quality - Image quality (default: 'auto')
   * @param {string} options.crop - Crop mode (default: 'fill')
   * @returns {string} Optimized image URL
   */
  static getResponsiveUrl(imageId, width, options = {}) {
    const {
      format = 'webp',
      quality = 'auto',
      crop = 'fill'
    } = options;

    // If imageId is already a full Cloudinary URL, extract the public ID
    const publicId = this.extractPublicId(imageId);

    // Build transformation string
    const transformations = [
      `w_${width}`,
      `c_${crop}`,
      `q_${quality}`,
      `f_${format}`
    ].join(',');

    return `${CLOUDINARY_BASE_URL}/${transformations}/${publicId}`;
  }

  /**
   * Convert image to WebP format
   * @param {string} imageUrl - Original image URL
   * @returns {string} WebP image URL
   */
  static convertToWebP(imageUrl) {
    const publicId = this.extractPublicId(imageUrl);
    return `${CLOUDINARY_BASE_URL}/f_webp,q_auto/${publicId}`;
  }

  /**
   * Generate srcset attribute for responsive images
   * @param {string} imageId - Cloudinary public ID or full URL
   * @param {number[]} widths - Array of widths (default: RESPONSIVE_WIDTHS)
   * @param {Object} options - Additional options
   * @returns {string} srcset attribute value
   */
  static generateSrcSet(imageId, widths = RESPONSIVE_WIDTHS, options = {}) {
    return widths
      .map(width => {
        const url = this.getResponsiveUrl(imageId, width, options);
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Generate sizes attribute for responsive images
   * @param {Object} breakpoints - Breakpoint configuration
   * @returns {string} sizes attribute value
   */
  static generateSizes(breakpoints = {}) {
    const defaultBreakpoints = {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px'
    };

    const bp = { ...defaultBreakpoints, ...breakpoints };

    return [
      `(max-width: ${bp.sm}) 100vw`,
      `(max-width: ${bp.md}) 50vw`,
      `(max-width: ${bp.lg}) 33vw`,
      '25vw'
    ].join(', ');
  }

  /**
   * Extract public ID from Cloudinary URL or return as-is if already a public ID
   * @param {string} imageUrl - Cloudinary URL or public ID
   * @returns {string} Public ID
   */
  static extractPublicId(imageUrl) {
    if (!imageUrl) return '';

    // If it's already a public ID (no protocol), return as-is
    if (!imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Extract public ID from full Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
    const urlParts = imageUrl.split('/upload/');
    if (urlParts.length < 2) return imageUrl;

    // Remove any existing transformations
    const afterUpload = urlParts[1];
    const parts = afterUpload.split('/');
    
    // If there are transformations, skip them
    const publicIdIndex = parts.findIndex(part => !part.includes('_') || part.includes('.'));
    return parts.slice(publicIdIndex).join('/');
  }

  /**
   * Lazy load images using Intersection Observer
   * @param {HTMLImageElement} element - Image element to lazy load
   * @param {Object} options - Intersection Observer options
   */
  static lazyLoadImage(element, options = {}) {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01
    };

    const observerOptions = { ...defaultOptions, ...options };

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load image immediately
      this.loadImage(element);
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observer.observe(element);
  }

  /**
   * Load image by setting src from data-src attribute
   * @param {HTMLImageElement} element - Image element
   */
  static loadImage(element) {
    const src = element.dataset.src;
    const srcset = element.dataset.srcset;

    if (src) {
      element.src = src;
      element.removeAttribute('data-src');
    }

    if (srcset) {
      element.srcset = srcset;
      element.removeAttribute('data-srcset');
    }

    element.classList.add('loaded');
  }

  /**
   * Initialize lazy loading for all images with data-src attribute
   * @param {string} selector - CSS selector for images (default: 'img[data-src]')
   * @param {Object} options - Intersection Observer options
   */
  static initLazyLoading(selector = 'img[data-src]', options = {}) {
    const images = document.querySelectorAll(selector);
    images.forEach(img => this.lazyLoadImage(img, options));
  }

  /**
   * Get optimized image configuration for a specific use case
   * @param {string} useCase - Use case: 'thumbnail', 'card', 'hero', 'gallery'
   * @returns {Object} Configuration object
   */
  static getPreset(useCase) {
    const presets = {
      thumbnail: {
        width: 150,
        quality: 'auto:low',
        crop: 'thumb',
        format: 'webp'
      },
      card: {
        width: 400,
        quality: 'auto',
        crop: 'fill',
        format: 'webp'
      },
      hero: {
        width: 1920,
        quality: 'auto:good',
        crop: 'fill',
        format: 'webp'
      },
      gallery: {
        width: 800,
        quality: 'auto',
        crop: 'fit',
        format: 'webp'
      }
    };

    return presets[useCase] || presets.card;
  }
}

/**
 * React hook for lazy loading images
 * @param {React.RefObject} ref - Ref to image element
 * @param {Object} options - Intersection Observer options
 * @returns {boolean} Whether image is loaded
 */
export function useLazyLoad(ref, options = {}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01
    };

    const observerOptions = { ...defaultOptions, ...options };

    if (!('IntersectionObserver' in window)) {
      ImageOptimizer.loadImage(element);
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ImageOptimizer.loadImage(entry.target);
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
  }, [ref, options]);

  return isLoaded;
}

export default ImageOptimizer;

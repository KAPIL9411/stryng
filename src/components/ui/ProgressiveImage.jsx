/**
 * Progressive Image Component
 * Loads low-quality placeholder first, then high-quality image
 * Provides better UX on slow connections
 */

import { useState, useEffect } from 'react';

export default function ProgressiveImage({
  src,
  placeholder,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto',
  onLoad,
}) {
  const [imgSrc, setImgSrc] = useState(placeholder || src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create a new image to preload the full quality version
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setIsLoading(false);
    };
  }, [src, onLoad]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${className} ${isLoading ? 'progressive-image--loading' : 'progressive-image--loaded'}`}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      style={{
        filter: isLoading ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s ease-out',
      }}
    />
  );
}

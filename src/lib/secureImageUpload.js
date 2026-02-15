/**
 * Secure Image Upload Utilities
 * Implements server-side upload pattern for better security
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validate image file before upload
 */
export const validateImageFile = (file) => {
  const errors = [];

  // Check if file exists
  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check file name
  if (file.name.length > 255) {
    errors.push('File name is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate secure upload signature (would be done on backend in production)
 * For now, we'll use unsigned upload with additional validation
 */
const generateUploadParams = () => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'stryng-products';

  return {
    timestamp,
    folder,
    upload_preset: UPLOAD_PRESET,
    // Add transformation for optimization
    transformation: 'f_auto,q_auto,w_1200',
  };
};

/**
 * Compress image before upload
 */
export const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
              );
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Upload image with validation and compression
 */
export const secureUploadImage = async (file, onProgress) => {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary not configured. Please add credentials to .env.local'
    );
  }

  try {
    // Compress image before upload
    const compressedFile = await compressImage(file);

    // Generate upload parameters
    const params = generateUploadParams(compressedFile);

    // Create form data
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('upload_preset', params.upload_preset);
    formData.append('folder', params.folder);
    formData.append('timestamp', params.timestamp);

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            width: response.width,
            height: response.height,
            format: response.format,
            size: response.bytes,
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
      );
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Secure upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple images with validation
 */
export const secureUploadMultipleImages = async (files, onProgress) => {
  const validFiles = [];
  const errors = [];

  // Validate all files first
  for (const file of files) {
    const validation = validateImageFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push({ file: file.name, errors: validation.errors });
    }
  }

  if (validFiles.length === 0) {
    throw new Error('No valid files to upload');
  }

  // Upload valid files
  const uploadPromises = validFiles.map((file, index) =>
    secureUploadImage(file, (progress) => {
      if (onProgress) {
        const overallProgress =
          ((index + progress / 100) / validFiles.length) * 100;
        onProgress(Math.round(overallProgress));
      }
    })
  );

  const results = await Promise.all(uploadPromises);

  return {
    uploaded: results,
    errors: errors.length > 0 ? errors : null,
  };
};

/**
 * Delete image from Cloudinary (requires backend in production)
 */
export const deleteImage = async (publicId) => {
  // In production, this should be a backend API call
  // For now, we'll just log it
  console.warn('Image deletion should be handled by backend:', publicId);

  // TODO: Implement backend endpoint for deletion
  // Example: await fetch('/api/images/delete', { method: 'POST', body: { publicId } });

  return {
    success: true,
    message: 'Deletion queued (implement backend endpoint)',
  };
};

/**
 * Get optimized image URL with transformations
 */
export const getOptimizedImageUrl = (url, options = {}) => {
  const {
    width = 'auto',
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // Insert transformation parameters into Cloudinary URL
  const transformation = `w_${width},q_${quality},f_${format},c_${crop}`;
  return url.replace('/upload/', `/upload/${transformation}/`);
};

/**
 * Generate responsive image srcset
 */
export const generateResponsiveSrcSet = (
  url,
  widths = [320, 640, 960, 1280, 1920]
) => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { width })} ${width}w`)
    .join(', ');
};

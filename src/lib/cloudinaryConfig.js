// Cloudinary configuration for image uploads
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('Cloudinary credentials not found. Image upload will not work.');
}

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file to upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - Uploaded image URL
 */
export const uploadImage = async (file, onProgress) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Cloudinary not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env.local');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'stryng-products'); // Organize uploads in folder

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.secure_url; // Return HTTPS URL
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

/**
 * Upload multiple images
 * @param {File[]} files - Array of image files
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string[]>} - Array of uploaded image URLs
 */
export const uploadMultipleImages = async (files, onProgress) => {
    const uploadPromises = files.map((file, index) =>
        uploadImage(file, (progress) => {
            // Calculate overall progress
            const overallProgress = ((index + progress / 100) / files.length) * 100;
            onProgress?.(Math.round(overallProgress));
        })
    );

    return Promise.all(uploadPromises);
};

export { CLOUD_NAME, UPLOAD_PRESET };

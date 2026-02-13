import { useState, useRef } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import { uploadMultipleImages } from '../../lib/cloudinaryConfig';

export default function ImageUpload({ images = [], onChange, maxImages = 5 }) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = async (files) => {
        const fileArray = Array.from(files);

        // Check max images
        if (images.length + fileArray.length > maxImages) {
            alert(`You can only upload up to ${maxImages} images`);
            return;
        }

        // Validate file types
        const validFiles = fileArray.filter(file => {
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} is not an image file`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const urls = await uploadMultipleImages(validFiles, setUploadProgress);
            onChange([...images, ...urls]);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload images. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const removeImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        onChange(newImages);
    };

    return (
        <div className="image-upload">
            {/* Upload Zone */}
            <div
                className={`image-upload__dropzone ${dragActive ? 'image-upload__dropzone--active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleChange}
                    style={{ display: 'none' }}
                />

                {uploading ? (
                    <div className="image-upload__uploading">
                        <Loader className="image-upload__spinner" size={32} />
                        <p>Uploading... {uploadProgress}%</p>
                    </div>
                ) : (
                    <div className="image-upload__prompt">
                        <Upload size={32} />
                        <p><strong>Click to upload</strong> or drag and drop</p>
                        <p className="image-upload__hint">PNG, JPG, WebP up to 10MB</p>
                    </div>
                )}
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
                <div className="image-upload__previews">
                    {images.map((url, index) => (
                        <div key={index} className="image-upload__preview">
                            <img src={url} alt={`Upload ${index + 1}`} />
                            <button
                                type="button"
                                className="image-upload__remove"
                                onClick={() => removeImage(index)}
                                aria-label="Remove image"
                            >
                                <X size={16} />
                            </button>
                            {index === 0 && (
                                <span className="image-upload__primary-badge">Primary</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <p className="image-upload__count">
                {images.length} / {maxImages} images uploaded
            </p>
        </div>
    );
}

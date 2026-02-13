import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import useStore from '../../store/useStore';
import ImageUpload from '../../components/admin/ImageUpload';

export default function ProductForm() {
    const { id } = useParams(); // If editing
    const navigate = useNavigate();
    const { products, createProduct, updateProduct } = useStore();
    const [images, setImages] = useState([]);
    const [colors, setColors] = useState([{ name: '', hex: '#000000' }]);
    const [sizes, setSizes] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

    const isEditing = !!id;

    // Load existing product data if editing
    useEffect(() => {
        if (isEditing) {
            const product = products.find(p => p.id === id);
            if (product) {
                setValue('name', product.name);
                setValue('slug', product.slug);
                setValue('description', product.description);
                setValue('price', product.price);
                setValue('original_price', product.originalPrice || product.original_price);
                setValue('discount', product.discount);
                setValue('category', product.category);
                setValue('brand', product.brand || 'FASHION STORE');
                setValue('rating', product.rating || 0);
                setValue('reviews_count', product.reviewCount || product.reviews_count || 0);
                setValue('is_new', product.isNew || product.is_new || false);
                setValue('is_trending', product.isTrending || product.is_trending || false);

                setImages(product.images || []);
                setColors(product.colors || [{ name: '', hex: '#000000' }]);
                setSizes(product.sizes || []);
            }
        }
    }, [isEditing, id, products, setValue]);

    // Auto-generate slug from name
    const productName = watch('name');
    useEffect(() => {
        if (productName && !isEditing) {
            const slug = productName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setValue('slug', slug);
        }
    }, [productName, isEditing, setValue]);

    const handleColorChange = (index, field, value) => {
        const newColors = [...colors];
        newColors[index][field] = value;
        setColors(newColors);
    };

    const addColor = () => {
        setColors([...colors, { name: '', hex: '#000000' }]);
    };

    const removeColor = (index) => {
        setColors(colors.filter((_, i) => i !== index));
    };

    const toggleSize = (size) => {
        setSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
        );
    };

    const onSubmit = async (data) => {
        if (images.length === 0) {
            alert('Please upload at least one image');
            return;
        }

        if (colors.some(c => !c.name || !c.hex)) {
            alert('Please fill in all color fields');
            return;
        }

        if (sizes.length === 0) {
            alert('Please select at least one size');
            return;
        }

        setSubmitting(true);

        const productData = {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: parseInt(data.price),
            original_price: parseInt(data.original_price),
            discount: parseInt(data.discount),
            category: data.category,
            brand: data.brand,
            images,
            colors,
            sizes,
            rating: parseFloat(data.rating) || 0,
            reviews_count: parseInt(data.reviews_count) || 0,
            is_new: data.is_new,
            is_trending: data.is_trending,
        };

        try {
            if (isEditing) {
                await updateProduct(id, productData);
            } else {
                await createProduct(productData);
            }
            navigate('/admin/products');
        } catch (error) {
            console.error('Error saving product:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'];
    const categories = ['shirts', 't-shirts', 'trousers', 'jackets', 'shorts', 'polo'];

    return (
        <div className="admin-page">
            <div className="admin-container">
                <div className="admin-header">
                    <button onClick={() => navigate('/admin/products')} className="btn btn--secondary">
                        <ArrowLeft size={18} /> Back to Products
                    </button>
                    <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="product-form">
                    {/* Images */}
                    <div className="form-section">
                        <h2>Product Images</h2>
                        <ImageUpload images={images} onChange={setImages} maxImages={5} />
                    </div>

                    {/* Basic Info */}
                    <div className="form-section">
                        <h2>Basic Information</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Product Name *</label>
                                <input
                                    type="text"
                                    {...register('name', { required: 'Name is required' })}
                                    className="form-input"
                                />
                                {errors.name && <span className="form-error">{errors.name.message}</span>}
                            </div>

                            <div className="form-group">
                                <label>Slug (URL) *</label>
                                <input
                                    type="text"
                                    {...register('slug', { required: 'Slug is required' })}
                                    className="form-input"
                                />
                                {errors.slug && <span className="form-error">{errors.slug.message}</span>}
                            </div>

                            <div className="form-group form-group--full">
                                <label>Description *</label>
                                <textarea
                                    {...register('description', { required: 'Description is required' })}
                                    className="form-input"
                                    rows="4"
                                />
                                {errors.description && <span className="form-error">{errors.description.message}</span>}
                            </div>

                            <div className="form-group">
                                <label>Category *</label>
                                <select {...register('category', { required: true })} className="form-input">
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Brand</label>
                                <input
                                    type="text"
                                    {...register('brand')}
                                    className="form-input"
                                    defaultValue="FASHION STORE"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="form-section">
                        <h2>Pricing</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Price (₹) *</label>
                                <input
                                    type="number"
                                    {...register('price', { required: true, min: 0 })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Original Price (₹)</label>
                                <input
                                    type="number"
                                    {...register('original_price', { min: 0 })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Discount (%)</label>
                                <input
                                    type="number"
                                    {...register('discount', { min: 0, max: 100 })}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="form-section">
                        <h2>Colors</h2>
                        {colors.map((color, index) => (
                            <div key={index} className="color-input-group">
                                <input
                                    type="text"
                                    placeholder="Color name"
                                    value={color.name}
                                    onChange={(e) => handleColorChange(index, 'name', e.target.value)}
                                    className="form-input"
                                />
                                <input
                                    type="color"
                                    value={color.hex}
                                    onChange={(e) => handleColorChange(index, 'hex', e.target.value)}
                                    className="color-picker"
                                />
                                {colors.length > 1 && (
                                    <button type="button" onClick={() => removeColor(index)} className="btn btn--danger btn--sm">
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addColor} className="btn btn--secondary btn--sm">
                            Add Color
                        </button>
                    </div>

                    {/* Sizes */}
                    <div className="form-section">
                        <h2>Sizes</h2>
                        <div className="size-selector">
                            {availableSizes.map(size => (
                                <label key={size} className="size-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={sizes.includes(size)}
                                        onChange={() => toggleSize(size)}
                                    />
                                    <span>{size}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="form-section">
                        <h2>Additional Information</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Rating (0-5)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    {...register('rating', { min: 0, max: 5 })}
                                    className="form-input"
                                    defaultValue="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>Reviews Count</label>
                                <input
                                    type="number"
                                    {...register('reviews_count', { min: 0 })}
                                    className="form-input"
                                    defaultValue="0"
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input type="checkbox" {...register('is_new')} />
                                    <span>Mark as New</span>
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input type="checkbox" {...register('is_trending')} />
                                    <span>Mark as Trending</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="form-actions">
                        <button type="button" onClick={() => navigate('/admin/products')} className="btn btn--secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--primary" disabled={submitting}>
                            <Save size={18} />
                            {submitting ? 'Saving...' : (isEditing ? 'Update Product' : 'Create Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

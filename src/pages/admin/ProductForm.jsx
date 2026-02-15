import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import useStore from '../../store/useStore';
import ImageUpload from '../../components/admin/ImageUpload';
import { useAllProducts } from '../../hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createProduct, updateProduct, showToast } = useStore();
  const { data: products = [], isLoading: isLoadingProducts } =
    useAllProducts();
  const queryClient = useQueryClient();
  const [images, setImages] = useState([]);
  const [colors, setColors] = useState([{ name: '', hex: '#000000' }]);
  const [sizes, setSizes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();

  const isEditing = !!id;

  // Load existing product data if editing
  useEffect(() => {
    if (isEditing && products.length > 0) {
      const product = products.find((p) => p.id === id);

      if (!product) {
        console.error('Product not found:', id);
        showToast('Product not found', 'error');
        navigate('/admin/products');
        return;
      }

      // Basic info
      setValue('name', product.name || '');
      setValue('slug', product.slug || '');
      setValue('description', product.description || '');
      setValue('category', product.category || '');
      setValue('brand', product.brand || 'FASHION STORE');

      // Pricing
      setValue('price', product.price || 0);
      setValue(
        'original_price',
        product.originalPrice || product.original_price || product.price || 0
      );
      setValue('discount', product.discount || 0);

      // Inventory
      setValue('sku', product.sku || '');
      setValue('stock', product.stock !== undefined ? product.stock : 0);
      setValue(
        'low_stock_threshold',
        product.lowStockThreshold || product.low_stock_threshold || 10
      );
      setValue('track_inventory', product.track_inventory !== false);

      // Additional info
      setValue('rating', product.rating || 0);
      setValue(
        'reviews_count',
        product.reviewCount || product.reviews_count || 0
      );
      setValue('is_new', product.isNew || product.is_new || false);
      setValue(
        'is_trending',
        product.isTrending || product.is_trending || false
      );

      // Complex fields
      setImages(product.images || []);
      setColors(
        product.colors && product.colors.length > 0
          ? product.colors
          : [{ name: '', hex: '#000000' }]
      );
      setSizes(product.sizes || []);
    }
  }, [isEditing, id, products, setValue, navigate, showToast]);

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

  // Show loading state while fetching products for edit (AFTER all hooks)
  if (isEditing && isLoadingProducts) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#666' }}>Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

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
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const onSubmit = async (data) => {
    // Validation
    if (images.length === 0) {
      showToast('Please upload at least one image', 'error');
      return;
    }

    if (colors.some((c) => !c.name || !c.hex)) {
      showToast('Please fill in all color fields', 'error');
      return;
    }

    if (sizes.length === 0) {
      showToast('Please select at least one size', 'error');
      return;
    }

    setSubmitting(true);

    // Generate unique SKU if not provided
    const sku =
      data.sku ||
      `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Ensure unique slug by appending timestamp if needed (only for new products)
    let slug = data.slug;
    if (!isEditing) {
      const existingProduct = products.find((p) => p.slug === slug);
      if (existingProduct) {
        slug = `${slug}-${Date.now()}`;
        showToast('Slug was modified to ensure uniqueness', 'info');
      }
    }

    const productData = {
      name: data.name,
      slug: slug,
      description: data.description,
      price: parseInt(data.price),
      original_price: parseInt(data.original_price) || parseInt(data.price),
      discount: parseInt(data.discount) || 0,
      category: data.category,
      brand: data.brand || 'FASHION STORE',
      images,
      colors,
      sizes,
      rating: parseFloat(data.rating) || 0,
      reviews_count: parseInt(data.reviews_count) || 0,
      is_new: data.is_new || false,
      is_trending: data.is_trending || false,
      // Inventory fields
      sku: sku,
      stock: parseInt(data.stock) || 0,
      low_stock_threshold: parseInt(data.low_stock_threshold) || 10,
      track_inventory: data.track_inventory !== false,
    };

    try {
      let result;
      if (isEditing) {
        result = await updateProduct(id, productData);
      } else {
        result = await createProduct(productData);
      }

      if (result.error) {
        // Handle specific error types
        if (result.error.code === '23505') {
          // Unique constraint violation
          if (result.error.message.includes('slug')) {
            throw new Error(
              'A product with this slug already exists. Please use a different name.'
            );
          } else if (result.error.message.includes('sku')) {
            throw new Error(
              'A product with this SKU already exists. Please use a different SKU.'
            );
          } else {
            throw new Error(
              'This product already exists. Please check slug and SKU.'
            );
          }
        }
        throw result.error;
      }

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      // Show success message
      showToast(
        isEditing
          ? 'Product updated successfully'
          : 'Product created successfully',
        'success'
      );

      // Navigate back to products list
      navigate('/admin/products');
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error.message || error.toString();
      showToast(
        `Failed to ${isEditing ? 'update' : 'create'} product: ${errorMessage}`,
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const availableSizes = [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    '28',
    '30',
    '32',
    '34',
    '36',
    '38',
  ];
  const categories = [
    'shirts',
    't-shirts',
    'trousers',
    'jackets',
    'shorts',
    'polo',
  ];

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <button
            onClick={() => navigate('/admin/products')}
            className="btn btn--secondary"
          >
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
                {errors.name && (
                  <span className="form-error">{errors.name.message}</span>
                )}
              </div>

              <div className="form-group">
                <label>Slug (URL) *</label>
                <input
                  type="text"
                  {...register('slug', { required: 'Slug is required' })}
                  className="form-input"
                />
                {errors.slug && (
                  <span className="form-error">{errors.slug.message}</span>
                )}
              </div>

              <div className="form-group form-group--full">
                <label>Description *</label>
                <textarea
                  {...register('description', {
                    required: 'Description is required',
                  })}
                  className="form-input"
                  rows="4"
                />
                {errors.description && (
                  <span className="form-error">
                    {errors.description.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  {...register('category', { required: true })}
                  className="form-input"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
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
            <h2>Pricing & Inventory</h2>
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

              <div className="form-group">
                <label>SKU (Stock Keeping Unit)</label>
                <input
                  type="text"
                  {...register('sku')}
                  className="form-input"
                  placeholder="Auto-generated if empty"
                />
                <small style={{ color: '#666', fontSize: '0.8125rem' }}>
                  Leave empty to auto-generate
                </small>
              </div>

              <div className="form-group">
                <label>Stock Quantity *</label>
                <input
                  type="number"
                  {...register('stock', { required: true, min: 0 })}
                  className="form-input"
                  defaultValue="0"
                />
              </div>

              <div className="form-group">
                <label>Low Stock Threshold</label>
                <input
                  type="number"
                  {...register('low_stock_threshold', { min: 0 })}
                  className="form-input"
                  defaultValue="10"
                />
                <small style={{ color: '#666', fontSize: '0.8125rem' }}>
                  Alert when stock falls below this number
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    {...register('track_inventory')}
                    defaultChecked
                  />
                  <span>Track Inventory</span>
                </label>
                <small
                  style={{
                    color: '#666',
                    fontSize: '0.8125rem',
                    display: 'block',
                    marginTop: '0.5rem',
                  }}
                >
                  Uncheck if this product has unlimited stock
                </small>
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
                  onChange={(e) =>
                    handleColorChange(index, 'name', e.target.value)
                  }
                  className="form-input"
                />
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) =>
                    handleColorChange(index, 'hex', e.target.value)
                  }
                  className="color-picker"
                />
                {colors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeColor(index)}
                    className="btn btn--danger btn--sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addColor}
              className="btn btn--secondary btn--sm"
            >
              Add Color
            </button>
          </div>

          {/* Sizes */}
          <div className="form-section">
            <h2>Sizes</h2>
            <div className="size-selector">
              {availableSizes.map((size) => (
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
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="btn btn--secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              <Save size={18} />
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Product'
                  : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

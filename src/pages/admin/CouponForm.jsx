import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import {
  createCoupon,
  getCouponById,
  updateCoupon,
} from '../../api/admin/coupons.admin.api';
import '../../styles/admin-coupons.css';

export default function CouponForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    max_discount: '',
    min_order_value: '0',
    max_uses: '',
    max_uses_per_user: '1',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  useEffect(() => {
    if (isEdit) {
      fetchCoupon();
    }
  }, [id]);

  const fetchCoupon = async () => {
    try {
      setLoading(true);
      const coupon = await getCouponById(id);
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value.toString(),
        max_discount: coupon.max_discount?.toString() || '',
        min_order_value: coupon.min_order_value.toString(),
        max_uses: coupon.max_uses?.toString() || '',
        max_uses_per_user: coupon.max_uses_per_user.toString(),
        start_date: coupon.start_date.slice(0, 16),
        end_date: coupon.end_date.slice(0, 16),
        is_active: coupon.is_active,
      });
    } catch (error) {
      console.error('Error fetching coupon:', error);
      alert('Failed to load coupon. It may have been deleted.');
      navigate('/admin/coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required';
    } else if (!/^[A-Z0-9]{4,20}$/.test(formData.code.toUpperCase())) {
      newErrors.code = 'Code must be 4-20 alphanumeric characters';
    }

    // Discount value validation
    if (!formData.discount_value || formData.discount_value <= 0) {
      newErrors.discount_value = 'Discount value must be positive';
    } else if (
      formData.discount_type === 'percentage' &&
      (formData.discount_value < 0 || formData.discount_value > 100)
    ) {
      newErrors.discount_value = 'Percentage must be between 0 and 100';
    }

    // Max discount validation for percentage
    if (
      formData.discount_type === 'percentage' &&
      formData.max_discount &&
      formData.max_discount <= 0
    ) {
      newErrors.max_discount = 'Max discount must be positive';
    }

    // Min order value validation
    if (formData.min_order_value < 0) {
      newErrors.min_order_value = 'Minimum order value cannot be negative';
    }

    // Max uses validation
    if (formData.max_uses && formData.max_uses <= 0) {
      newErrors.max_uses = 'Max uses must be positive';
    }

    // Max uses per user validation
    if (!formData.max_uses_per_user || formData.max_uses_per_user <= 0) {
      newErrors.max_uses_per_user = 'Max uses per user must be positive';
    }

    // Date validation
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const couponData = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_discount:
          formData.discount_type === 'percentage' && formData.max_discount
            ? parseFloat(formData.max_discount)
            : null,
        min_order_value: parseFloat(formData.min_order_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        max_uses_per_user: parseInt(formData.max_uses_per_user),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: formData.is_active,
      };

      const result = isEdit
        ? await updateCoupon(id, couponData)
        : await createCoupon(couponData);

      // Success - navigate back to coupons list
      navigate('/admin/coupons');
    } catch (error) {
      console.error('Error saving coupon:', error);
      
      // Handle specific error cases
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('already exists')) {
        setErrors({ code: 'This coupon code already exists. Please use a different code.' });
      } else if (errorMessage.includes('not found')) {
        alert('Coupon not found. It may have been deleted.');
        navigate('/admin/coupons');
      } else {
        alert(errorMessage || 'An error occurred while saving the coupon');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading coupon...</div>;
  }

  return (
    <div className="coupon-form-page">
      <div className="form-header">
        <button onClick={() => navigate('/admin/coupons')} className="btn-back">
          <ArrowLeft size={18} />
          Back to Coupons
        </button>
        <h1>{isEdit ? 'Edit Coupon' : 'Create New Coupon'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="coupon-form">
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="code">
              Coupon Code <span className="required">*</span>
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              disabled={isEdit}
              placeholder="e.g., SAVE20"
              className={errors.code ? 'error' : ''}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.code && <span className="error-message">{errors.code}</span>}
            <span className="field-hint">
              4-20 alphanumeric characters. Will be converted to uppercase.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the coupon"
              rows="3"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Discount Details</h2>

          <div className="form-group">
            <label>
              Discount Type <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="discount_type"
                  value="percentage"
                  checked={formData.discount_type === 'percentage'}
                  onChange={handleChange}
                />
                <span>Percentage</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="discount_type"
                  value="fixed"
                  checked={formData.discount_type === 'fixed'}
                  onChange={handleChange}
                />
                <span>Fixed Amount</span>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discount_value">
                Discount Value <span className="required">*</span>
              </label>
              <input
                type="number"
                id="discount_value"
                name="discount_value"
                value={formData.discount_value}
                onChange={handleChange}
                placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
                step={formData.discount_type === 'percentage' ? '0.01' : '1'}
                min="0"
                className={errors.discount_value ? 'error' : ''}
              />
              {errors.discount_value && (
                <span className="error-message">{errors.discount_value}</span>
              )}
            </div>

            {formData.discount_type === 'percentage' && (
              <div className="form-group">
                <label htmlFor="max_discount">Max Discount (₹)</label>
                <input
                  type="number"
                  id="max_discount"
                  name="max_discount"
                  value={formData.max_discount}
                  onChange={handleChange}
                  placeholder="500"
                  step="1"
                  min="0"
                  className={errors.max_discount ? 'error' : ''}
                />
                {errors.max_discount && (
                  <span className="error-message">{errors.max_discount}</span>
                )}
                <span className="field-hint">Optional cap on discount amount</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="min_order_value">Minimum Order Value (₹)</label>
            <input
              type="number"
              id="min_order_value"
              name="min_order_value"
              value={formData.min_order_value}
              onChange={handleChange}
              placeholder="0"
              step="1"
              min="0"
              className={errors.min_order_value ? 'error' : ''}
            />
            {errors.min_order_value && (
              <span className="error-message">{errors.min_order_value}</span>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Usage Limits</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="max_uses">Max Total Uses</label>
              <input
                type="number"
                id="max_uses"
                name="max_uses"
                value={formData.max_uses}
                onChange={handleChange}
                placeholder="Leave empty for unlimited"
                step="1"
                min="1"
                className={errors.max_uses ? 'error' : ''}
              />
              {errors.max_uses && (
                <span className="error-message">{errors.max_uses}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="max_uses_per_user">
                Max Uses Per User <span className="required">*</span>
              </label>
              <input
                type="number"
                id="max_uses_per_user"
                name="max_uses_per_user"
                value={formData.max_uses_per_user}
                onChange={handleChange}
                placeholder="1"
                step="1"
                min="1"
                className={errors.max_uses_per_user ? 'error' : ''}
              />
              {errors.max_uses_per_user && (
                <span className="error-message">{errors.max_uses_per_user}</span>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Validity Period</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">
                Start Date <span className="required">*</span>
              </label>
              <input
                type="datetime-local"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={errors.start_date ? 'error' : ''}
              />
              {errors.start_date && (
                <span className="error-message">{errors.start_date}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="end_date">
                End Date <span className="required">*</span>
              </label>
              <input
                type="datetime-local"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={errors.end_date ? 'error' : ''}
              />
              {errors.end_date && (
                <span className="error-message">{errors.end_date}</span>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <span>Active</span>
            </label>
            <span className="field-hint">
              Inactive coupons cannot be used by customers
            </span>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/admin/coupons')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : isEdit ? 'Update Coupon' : 'Create Coupon'}
          </button>
        </div>
      </form>
    </div>
  );
}

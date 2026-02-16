import { useState } from 'react';
import { Tag, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { validateCoupon } from '../../api/coupons.api';
import useStore from '../../store/useStore';

export default function CouponInput({ orderTotal }) {
  const { user, applyCoupon, appliedCoupon } = useStore();
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [message, setMessage] = useState(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a coupon code' });
      return;
    }

    if (!user || !user.id) {
      setMessage({ type: 'error', text: 'Please log in to apply coupons' });
      return;
    }

    if (appliedCoupon) {
      setMessage({ type: 'error', text: 'Remove current coupon first' });
      return;
    }

    setIsValidating(true);
    setMessage(null);

    try {
      console.log('Validating coupon:', { code: couponCode, userId: user.id, orderTotal });
      const result = await validateCoupon(couponCode, user.id, orderTotal);
      console.log('Validation result:', result);

      if (result.success && result.data.valid) {
        const couponData = result.data;
        applyCoupon(
          {
            id: couponData.coupon_id,
            code: couponData.code,
            discount_type: couponData.discount_type,
            discount_value: couponData.discount_value,
          },
          couponData.discount_amount
        );
        setMessage({
          type: 'success',
          text: `Coupon applied! You saved ₹${couponData.discount_amount.toFixed(2)}`,
        });
        setCouponCode('');
      } else {
        setMessage({
          type: 'error',
          text: result.data?.error || 'Invalid coupon code',
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setMessage({
        type: 'error',
        text: 'Failed to validate coupon. Please try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  if (appliedCoupon) {
    return null;
  }

  return (
    <div className="coupon-input-container">
      <div className="coupon-input-wrapper">
        <div className="coupon-input-group">
          <Tag size={18} className="coupon-icon" />
          <input
            type="text"
            className="coupon-input"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            disabled={isValidating}
            maxLength={20}
          />
        </div>
        <button
          className="coupon-apply-btn"
          onClick={handleApplyCoupon}
          disabled={isValidating || !couponCode.trim()}
        >
          {isValidating ? (
            <>
              <Loader size={16} className="btn-spinner" />
              Applying...
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>

      {message && (
        <div className={`coupon-message ${message.type}`}>
          {message.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}

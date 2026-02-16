import { X, Tag, CheckCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { formatPrice } from '../../utils/format';

export default function AppliedCoupon() {
  const { appliedCoupon, couponDiscount, removeCoupon } = useStore();

  if (!appliedCoupon) {
    return null;
  }

  const handleRemove = () => {
    removeCoupon();
  };

  return (
    <div className="applied-coupon-container">
      <div className="applied-coupon-content">
        <div className="coupon-success-icon">
          <CheckCircle size={20} />
        </div>
        <div className="coupon-details">
          <div className="coupon-code-display">
            <Tag size={16} />
            <span className="coupon-code">{appliedCoupon.code}</span>
          </div>
          <p className="coupon-savings">
            You saved {formatPrice(couponDiscount)}
          </p>
        </div>
      </div>
      <button
        className="remove-coupon-btn"
        onClick={handleRemove}
        aria-label="Remove coupon"
        title="Remove coupon"
      >
        <X size={18} />
      </button>
    </div>
  );
}

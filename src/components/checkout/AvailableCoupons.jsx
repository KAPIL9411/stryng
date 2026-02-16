import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Tag, Percent, DollarSign, Loader } from 'lucide-react';
import { getAvailableCoupons } from '../../api/coupons.api';
import { validateCoupon } from '../../api/coupons.api';
import useStore from '../../store/useStore';
import { formatPrice } from '../../utils/format';

export default function AvailableCoupons({ orderTotal }) {
  const { user, applyCoupon, appliedCoupon } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [applyingCouponId, setApplyingCouponId] = useState(null);

  useEffect(() => {
    if (isExpanded && coupons.length === 0) {
      fetchCoupons();
    }
  }, [isExpanded]);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const result = await getAvailableCoupons(orderTotal);
      if (result.success) {
        setCoupons(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async (coupon) => {
    if (appliedCoupon) {
      return;
    }

    setApplyingCouponId(coupon.id);

    try {
      const result = await validateCoupon(coupon.code, user.id, orderTotal);

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
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
    } finally {
      setApplyingCouponId(null);
    }
  };

  const getDiscountDisplay = (coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else {
      return `₹${coupon.discount_value} OFF`;
    }
  };

  const getMinOrderDisplay = (coupon) => {
    if (coupon.min_order_value > 0) {
      return `Min order: ${formatPrice(coupon.min_order_value)}`;
    }
    return 'No minimum order';
  };

  if (appliedCoupon) {
    return null;
  }

  return (
    <div className="available-coupons-container">
      <button
        className="available-coupons-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="toggle-left">
          <Tag size={18} />
          <span>Available Coupons</span>
          {coupons.length > 0 && !isExpanded && (
            <span className="coupon-count">{coupons.length}</span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="available-coupons-list">
          {isLoading ? (
            <div className="coupons-loading">
              <Loader size={24} className="spinner" />
              <p>Loading coupons...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="coupons-empty">
              <Tag size={32} />
              <p>No coupons available for your order</p>
            </div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="coupon-card">
                <div className="coupon-card-header">
                  <div className="coupon-icon-wrapper">
                    {coupon.discount_type === 'percentage' ? (
                      <Percent size={20} />
                    ) : (
                      <DollarSign size={20} />
                    )}
                  </div>
                  <div className="coupon-info">
                    <div className="coupon-code-badge">{coupon.code}</div>
                    <h4 className="coupon-discount">
                      {getDiscountDisplay(coupon)}
                    </h4>
                    {coupon.description && (
                      <p className="coupon-description">{coupon.description}</p>
                    )}
                    <p className="coupon-min-order">
                      {getMinOrderDisplay(coupon)}
                    </p>
                  </div>
                </div>
                <button
                  className="coupon-apply-btn-card"
                  onClick={() => handleApplyCoupon(coupon)}
                  disabled={applyingCouponId === coupon.id}
                >
                  {applyingCouponId === coupon.id ? (
                    <>
                      <Loader size={14} className="btn-spinner" />
                      Applying...
                    </>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

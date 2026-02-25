/**
 * WORLD-CLASS CHECKOUT EXPERIENCE
 * Luxury fashion e-commerce design
 * Optimized for conversion and user experience
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Check,
  Loader,
  ChevronLeft,
  Package,
  Truck,
  Shield,
  Edit3,
  CreditCard,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/format';
import { getCachedAddresses } from '../lib/preloadAddresses';
import { getUserAddresses } from '../api/addresses.api';
import { createOrderOptimized, markPaymentAsPaidOptimized } from '../api/orders.optimized.api';
import SEO from '../components/SEO';

// UPI Configuration
const MERCHANT_VPA = 'kurmikapil154@okicici';
const MERCHANT_NAME = 'Stryng Clothing';

// Memoized AddressCard component
const AddressCard = memo(({ address, isSelected, onSelect, onEdit }) => {
  return (
    <div
      className={`checkout-address-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(address)}
    >
      <div className="address-card-radio">
        <div className={`radio-circle ${isSelected ? 'checked' : ''}`}>
          {isSelected && <div className="radio-dot" />}
        </div>
      </div>
      
      <div className="address-card-content">
        <div className="address-card-header">
          <h4 className="address-card-name">{address.full_name}</h4>
          {address.is_default && (
            <span className="address-badge">Default</span>
          )}
        </div>
        
        <p className="address-card-text">
          {address.address_line1}
          {address.address_line2 && `, ${address.address_line2}`}
        </p>
        
        {address.landmark && (
          <p className="address-card-landmark">{address.landmark}</p>
        )}
        
        <p className="address-card-location">
          {address.city}, {address.state} {address.pincode}
        </p>
        
        <p className="address-card-phone">{address.phone}</p>
      </div>
      
      {isSelected && (
        <button
          className="address-card-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(address);
          }}
        >
          <Edit3 size={16} />
        </button>
      )}
    </div>
  );
});

AddressCard.displayName = 'AddressCard';

// Memoized OrderItem component
const OrderItem = memo(({ item }) => {
  return (
    <div className="checkout-order-item">
      <div className="order-item-image-wrapper">
        <img
          src={item.images[0]}
          alt={item.name}
          className="order-item-image"
          loading="lazy"
        />
        <span className="order-item-qty">{item.quantity}</span>
      </div>
      
      <div className="order-item-details">
        <h4 className="order-item-name">{item.name}</h4>
        <div className="order-item-meta">
          <span>Size: {item.selectedSize}</span>
          <span className="meta-separator">•</span>
          <span className="order-item-color">
            <span
              className="color-swatch"
              style={{ backgroundColor: item.selectedColor?.hex }}
            />
            {item.selectedColor?.name}
          </span>
        </div>
      </div>
      
      <div className="order-item-price">
        {formatPrice(item.price * item.quantity)}
      </div>
    </div>
  );
});

OrderItem.displayName = 'OrderItem';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart, user, couponDiscount, clearCoupon } = useStore();

  // State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Address, 2: Review & Pay, 3: Payment Verification
  const [orderId, setOrderId] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // Calculations
  const subtotal = useMemo(() => getCartTotal(), [getCartTotal]);
  const shipping = 0; // Free shipping
  const tax = useMemo(() => Math.round((subtotal - couponDiscount) * 0.18), [subtotal, couponDiscount]);
  const total = useMemo(() => subtotal + shipping + tax - couponDiscount, [subtotal, shipping, tax, couponDiscount]);

  // Redirect if not logged in or empty cart
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (cart.length === 0 && currentStep !== 3) {
      navigate('/cart');
      return;
    }
  }, [user, cart, navigate, currentStep]);

  // Load addresses on mount
  useEffect(() => {
    if (user && currentStep === 1) {
      loadAddresses();
    }
  }, [user, currentStep]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 Checkout State:', { currentStep, orderId, isPlacingOrder, cartLength: cart.length });
  }, [currentStep, orderId, isPlacingOrder, cart.length]);

  // Load addresses (instant from cache)
  const loadAddresses = useCallback(async () => {
    const cached = getCachedAddresses();
    if (cached && cached.length > 0) {
      setAddresses(cached);
      const defaultAddr = cached.find(a => a.is_default) || cached[0];
      setSelectedAddress(defaultAddr);
      return;
    }

    const response = await getUserAddresses();
    if (response.success) {
      setAddresses(response.data);
      const defaultAddr = response.data.find(a => a.is_default) || response.data[0];
      setSelectedAddress(defaultAddr);
    }
  }, []);

  // Place order (optimized - instant feedback)
  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress || isPlacingOrder) {
      console.log('⚠️ Cannot place order:', { selectedAddress, isPlacingOrder });
      return;
    }

    console.log('🚀 Starting order creation...');
    setIsPlacingOrder(true);

    // Set a timeout to prevent infinite loading (30 seconds)
    const timeoutId = setTimeout(() => {
      console.error('⏰ Order creation timeout after 30 seconds');
      setIsPlacingOrder(false);
      alert('Order creation is taking too long. Please check your internet connection and try again.');
    }, 30000);

    try {
      const { appliedCoupon } = useStore.getState();

      const orderData = {
        total,
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          price: item.price,
        })),
        address: {
          full_name: selectedAddress.full_name,
          phone: selectedAddress.phone,
          address_line1: selectedAddress.address_line1,
          address_line2: selectedAddress.address_line2,
          landmark: selectedAddress.landmark,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
        },
        paymentMethod: 'upi',
        coupon: appliedCoupon ? {
          id: appliedCoupon.id,
          code: appliedCoupon.code,
          discount: couponDiscount,
        } : null,
      };

      console.log('📦 Order data prepared:', { total, itemCount: cart.length });
      
      const startTime = Date.now();
      const result = await createOrderOptimized(orderData);
      const endTime = Date.now();
      
      // Clear timeout if request completes
      clearTimeout(timeoutId);
      
      console.log(`⏱️ Order creation took ${endTime - startTime}ms`);

      if (result.success) {
        console.log('✅ Order created successfully:', result.data.id);
        setOrderId(result.data.id);
        setCurrentStep(3); // Move to payment verification
        setIsPlacingOrder(false); // Reset immediately
      } else {
        console.error('❌ Order creation failed:', result.error);
        setIsPlacingOrder(false);
        alert(result.error || 'Failed to place order. Please try again.');
      }
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      console.error('💥 Order placement error:', error);
      setIsPlacingOrder(false);
      alert('Failed to place order. Please try again.');
    }
  }, [selectedAddress, total, cart, couponDiscount, isPlacingOrder]);

  // Confirm payment
  const handlePaymentConfirmation = useCallback(async () => {
    if (!orderId || isConfirmingPayment) return;

    setIsConfirmingPayment(true);

    try {
      console.log('💳 Confirming payment for order:', orderId);
      
      const result = await markPaymentAsPaidOptimized(orderId, transactionId);

      if (result.success) {
        console.log('✅ Payment confirmed successfully');
        clearCart();
        clearCoupon();
        navigate(`/order-success/${orderId}`);
      } else {
        alert(result.error || 'Failed to confirm payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      alert('Failed to confirm payment. Please try again or contact support.');
    } finally {
      setIsConfirmingPayment(false);
    }
  }, [orderId, transactionId, isConfirmingPayment, clearCart, clearCoupon, navigate]);

  const handleAddressSelect = useCallback((address) => {
    setSelectedAddress(address);
  }, []);

  const handleEditAddress = useCallback((address) => {
    navigate('/addresses');
  }, [navigate]);

  const handleContinueToReview = useCallback(() => {
    if (selectedAddress) {
      setCurrentStep(2);
    }
  }, [selectedAddress]);

  const copyUPIId = useCallback(() => {
    navigator.clipboard.writeText(MERCHANT_VPA);
    // Could add a toast notification here
  }, []);

  // UPI Payment Link
  const upiLink = useMemo(
    () => `upi://pay?pa=${MERCHANT_VPA}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=Order%20Payment`,
    [total]
  );

  const qrCodeUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`,
    [upiLink]
  );

  if (!user || cart.length === 0) {
    return null;
  }

  return (
    <>
      <SEO title="Checkout - Stryng Clothing" description="Complete your order" />

      <div className="checkout-page">
        {/* Header */}
        <div className="checkout-header">
          <div className="checkout-header-content">
            <button
              onClick={() => currentStep === 2 ? setCurrentStep(1) : navigate('/cart')}
              className="checkout-back-btn"
            >
              <ChevronLeft size={20} />
              <span>Back</span>
            </button>
            
            <h1 className="checkout-title">Secure Checkout</h1>
            
            <div className="checkout-secure-badge">
              <Shield size={16} />
              <span>Secure</span>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="checkout-progress">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="progress-step-number">1</div>
              <span className="progress-step-label">Delivery</span>
            </div>
            <div className="progress-line" />
            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="progress-step-number">2</div>
              <span className="progress-step-label">Review</span>
            </div>
            <div className="progress-line" />
            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="progress-step-number">3</div>
              <span className="progress-step-label">Payment</span>
            </div>
          </div>
        </div>

        <div className="checkout-container">
          <div className="checkout-main">
            {/* Step 1: Delivery Address */}
            {currentStep === 1 && (
              <div className="checkout-section">
                <div className="section-header">
                  <div className="section-icon">
                    <MapPin size={20} />
                  </div>
                  <h2 className="section-title">Delivery Address</h2>
                  <Link to="/addresses" className="section-action-link">
                    <Plus size={16} />
                    <span>Add New</span>
                  </Link>
                </div>

                <div className="section-content">
                  {addresses.length === 0 ? (
                    <div className="checkout-empty-state">
                      <div className="empty-state-icon">
                        <MapPin size={48} />
                      </div>
                      <h3 className="empty-state-title">No saved addresses</h3>
                      <p className="empty-state-text">
                        Add a delivery address to continue
                      </p>
                      <Link to="/addresses" className="btn-primary-checkout">
                        <Plus size={18} />
                        Add Address
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="address-list">
                        {addresses.map((address) => (
                          <AddressCard
                            key={address.id}
                            address={address}
                            isSelected={selectedAddress?.id === address.id}
                            onSelect={handleAddressSelect}
                            onEdit={handleEditAddress}
                          />
                        ))}
                      </div>

                      <button
                        onClick={handleContinueToReview}
                        disabled={!selectedAddress}
                        className="btn-continue-checkout"
                      >
                        Continue to Payment
                        <ChevronLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Review & Payment */}
            {currentStep === 2 && (
              <>
                {/* Delivery Summary */}
                <div className="checkout-section">
                  <div className="section-header">
                    <div className="section-icon">
                      <Truck size={20} />
                    </div>
                    <h2 className="section-title">Delivery Details</h2>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="section-action-link"
                    >
                      <Edit3 size={16} />
                      <span>Change</span>
                    </button>
                  </div>

                  <div className="section-content">
                    <div className="delivery-summary">
                      <div className="delivery-summary-header">
                        <h4>{selectedAddress?.full_name}</h4>
                        {selectedAddress?.is_default && (
                          <span className="address-badge">Default</span>
                        )}
                      </div>
                      <p className="delivery-summary-address">
                        {selectedAddress?.address_line1}
                        {selectedAddress?.address_line2 && `, ${selectedAddress.address_line2}`}
                      </p>
                      <p className="delivery-summary-location">
                        {selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.pincode}
                      </p>
                      <p className="delivery-summary-phone">{selectedAddress?.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="checkout-section">
                  <div className="section-header">
                    <div className="section-icon">
                      <Package size={20} />
                    </div>
                    <h2 className="section-title">Order Items ({cart.length})</h2>
                  </div>

                  <div className="section-content">
                    <div className="order-items-list">
                      {cart.map((item) => (
                        <OrderItem key={item.cartId} item={item} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="checkout-section">
                  <div className="section-header">
                    <div className="section-icon">
                      <CreditCard size={20} />
                    </div>
                    <h2 className="section-title">Payment Method</h2>
                  </div>

                  <div className="section-content">
                    <div className="payment-method-card">
                      <div className="payment-method-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <rect width="32" height="32" rx="8" fill="var(--color-accent-light)" />
                          <path d="M16 8L20 12L16 16L12 12L16 8Z" fill="var(--color-accent)" />
                          <path d="M16 16L20 20L16 24L12 20L16 16Z" fill="var(--color-accent-dark)" />
                        </svg>
                      </div>
                      <div className="payment-method-info">
                        <h4>UPI Payment</h4>
                        <p>Pay securely using any UPI app</p>
                      </div>
                      <div className="payment-method-check">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>

                    <div className="payment-security-note">
                      <Shield size={14} />
                      <span>Your payment information is encrypted and secure</span>
                    </div>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="btn-place-order-checkout"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader size={20} className="btn-spinner" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <Shield size={20} />
                      Place Order • {formatPrice(total)}
                    </>
                  )}
                </button>
              </>
            )}

            {/* Step 3: Payment Verification */}
            {currentStep === 3 && (
              <>
                <div className="checkout-section">
                  <div className="section-header">
                    <div className="section-icon">
                      <CheckCircle2 size={20} />
                    </div>
                    <h2 className="section-title">Order Created Successfully!</h2>
                  </div>

                  <div className="section-content">
                    <div className="order-success-message">
                      <p>Your order <strong>#{orderId || 'Processing...'}</strong> has been created.</p>
                      <p>Please complete the payment to confirm your order.</p>
                    </div>
                  </div>
                </div>

                {/* UPI Payment Section */}
                {orderId && (
                  <div className="checkout-section">
                    <div className="section-header">
                      <div className="section-icon">
                        <CreditCard size={20} />
                      </div>
                      <h2 className="section-title">Complete Payment</h2>
                    </div>

                    <div className="section-content">
                      {/* QR Code */}
                      <div className="payment-qr-section">
                        <h4>Scan QR Code</h4>
                        <div className="qr-code-wrapper">
                          <img
                            src={qrCodeUrl}
                            alt="UPI QR Code"
                            className="qr-code-image"
                          />
                        </div>
                        <p className="qr-hint">Scan with any UPI app (GPay, PhonePe, Paytm)</p>
                      </div>

                      <div className="payment-divider">
                        <span>OR</span>
                      </div>

                      {/* UPI ID */}
                      <div className="payment-upi-section">
                        <h4>Pay via UPI ID</h4>
                        <div className="upi-id-display">
                          <span className="upi-id-text">{MERCHANT_VPA}</span>
                          <button
                            onClick={copyUPIId}
                            className="upi-copy-btn"
                            title="Copy UPI ID"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        <div className="payment-amount-box">
                          <span>Amount to pay</span>
                          <strong>{formatPrice(total)}</strong>
                        </div>
                        <a
                          href={upiLink}
                          className="btn-open-upi"
                        >
                          <ExternalLink size={18} />
                          Open UPI App
                        </a>
                      </div>

                      {/* Transaction ID Input */}
                      <div className="transaction-id-section">
                        <h4>After Payment</h4>
                        <div className="input-group">
                          <label htmlFor="transaction-id">
                            UPI Transaction ID (Optional)
                          </label>
                          <input
                            id="transaction-id"
                            type="text"
                            className="transaction-input"
                            placeholder="e.g., 123456789012"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                          />
                          <small className="input-hint">
                            Helps us verify your payment faster
                          </small>
                        </div>

                        <button
                          onClick={handlePaymentConfirmation}
                          disabled={isConfirmingPayment}
                          className="btn-confirm-payment"
                        >
                          {isConfirmingPayment ? (
                            <>
                              <Loader size={20} className="btn-spinner" />
                              Verifying Payment...
                            </>
                          ) : (
                            <>
                              <Check size={20} />
                              I Have Completed Payment
                            </>
                          )}
                        </button>

                        <div className="payment-security-note">
                          <Shield size={14} />
                          <span>Your payment is secure and encrypted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3 className="order-summary-title">Order Summary</h3>

              <div className="order-summary-items">
                {cart.slice(0, 3).map((item) => (
                  <div key={item.cartId} className="summary-item">
                    <img src={item.images[0]} alt={item.name} />
                    <div className="summary-item-info">
                      <p className="summary-item-name">{item.name}</p>
                      <p className="summary-item-meta">
                        Qty: {item.quantity} • {item.selectedSize}
                      </p>
                    </div>
                    <span className="summary-item-price">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                {cart.length > 3 && (
                  <p className="summary-more-items">
                    +{cart.length - 3} more item{cart.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="order-summary-divider" />

              <div className="order-summary-totals">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span className="summary-free">FREE</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="summary-row summary-discount">
                    <span>Discount</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Tax (GST 18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
              </div>

              <div className="order-summary-divider" />

              <div className="order-summary-total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="order-summary-savings">
                  <CheckCircle2 size={16} />
                  <span>You're saving {formatPrice(couponDiscount)}</span>
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="checkout-trust-card">
              <div className="trust-item">
                <Shield size={18} />
                <div>
                  <h5>Secure Payment</h5>
                  <p>256-bit SSL encryption</p>
                </div>
              </div>
              <div className="trust-item">
                <Truck size={18} />
                <div>
                  <h5>Free Shipping</h5>
                  <p>On all orders</p>
                </div>
              </div>
              <div className="trust-item">
                <Package size={18} />
                <div>
                  <h5>Easy Returns</h5>
                  <p>30-day return policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

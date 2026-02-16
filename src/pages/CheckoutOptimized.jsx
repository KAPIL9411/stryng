import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Check,
  Loader,
  Copy,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  Package,
  CreditCard,
  CheckCircle2,
  Clock,
  Shield,
  Truck,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/format';
import { trackBeginCheckout } from '../lib/analytics';
import { getUserAddresses } from '../api/addresses.api';
import { createOrder, markPaymentAsPaid } from '../api/orders.api';
import SEO from '../components/SEO';

// UPI Configuration
const MERCHANT_VPA = 'kurmikapil154@okicici';
const MERCHANT_NAME = 'Stryng Clothing';

// Memoized AddressCard component
const AddressCard = memo(({ address, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(address);
  }, [address, onSelect]);

  return (
    <div
      className={`modern-address-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="address-radio">
        <div className="radio-outer">
          {isSelected && <div className="radio-inner" />}
        </div>
      </div>
      <div className="address-content">
        <div className="address-header">
          <h4>{address.full_name}</h4>
          {address.is_default && (
            <span className="default-badge">Default</span>
          )}
        </div>
        <p className="address-text">
          {address.address_line1}
          {address.address_line2 && `, ${address.address_line2}`}
        </p>
        {address.landmark && (
          <p className="address-landmark">Near: {address.landmark}</p>
        )}
        <p className="address-location">
          {address.city}, {address.state} - {address.pincode}
        </p>
        <p className="address-phone">📞 {address.phone}</p>
      </div>
      {isSelected && (
        <div className="selected-indicator">
          <CheckCircle2 size={20} />
        </div>
      )}
    </div>
  );
});

AddressCard.displayName = 'AddressCard';

// Memoized OrderItem component
const OrderItem = memo(({ item, isCompact = false }) => {
  const itemTotal = useMemo(
    () => formatPrice(item.price * item.quantity),
    [item.price, item.quantity]
  );

  return (
    <div className={`modern-order-item ${isCompact ? 'compact' : ''}`}>
      <div className="item-image-wrapper">
        <img
          src={item.images[0]}
          alt={item.name}
          className="item-image"
          loading="lazy"
        />
        <span className="item-quantity">{item.quantity}</span>
      </div>
      <div className="item-details">
        <h4 className="item-name">{item.name}</h4>
        <div className="item-meta">
          <span className="item-size">Size: {item.selectedSize}</span>
          <span className="item-separator">•</span>
          <span className="item-color">
            <span
              className="color-dot"
              style={{ backgroundColor: item.selectedColor?.hex }}
            />
            {item.selectedColor?.name}
          </span>
        </div>
        {!isCompact && (
          <p className="item-price-mobile">{itemTotal}</p>
        )}
      </div>
      {!isCompact && (
        <div className="item-price-desktop">
          {itemTotal}
        </div>
      )}
    </div>
  );
});

OrderItem.displayName = 'OrderItem';

export default function CheckoutOptimized() {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart, user } = useStore();

  // Prevent double submission
  const isCreatingOrder = useRef(false);
  const isConfirmingPayment = useRef(false);

  // State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showSummary, setShowSummary] = useState(false);

  // Cart Calculations - memoized for performance
  const subtotal = useMemo(() => getCartTotal(), [getCartTotal]);
  const shippingCost = 0;
  const tax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const total = useMemo(() => subtotal + shippingCost + tax, [subtotal, shippingCost, tax]);

  const formattedSubtotal = useMemo(() => formatPrice(subtotal), [subtotal]);
  const formattedTax = useMemo(() => formatPrice(tax), [tax]);
  const formattedTotal = useMemo(() => formatPrice(total), [total]);

  // UPI Payment Link - memoized
  const upiLink = useMemo(
    () => `upi://pay?pa=${MERCHANT_VPA}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=Order Payment`,
    [total]
  );

  const qrCodeUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`,
    [upiLink]
  );

  // Memoize event handlers
  const handleAddressSelect = useCallback((address) => {
    setSelectedAddress(address);
  }, []);

  const copyUPIId = useCallback(() => {
    navigator.clipboard.writeText(MERCHANT_VPA);
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2000);
  }, []);

  const handleTransactionIdChange = useCallback((e) => {
    setTransactionId(e.target.value);
  }, []);

  const toggleSummary = useCallback(() => {
    setShowSummary(prev => !prev);
  }, []);

  // Redirect if empty cart or not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (cart.length === 0 && currentStep !== 3) {
      navigate('/cart');
      return;
    }

    if (cart.length > 0) {
      trackBeginCheckout(cart, total);
    }

    if (currentStep === 1) {
      fetchAddresses();
    }
  }, [cart, user, navigate, total, currentStep]);

  // Countdown after order success
  useEffect(() => {
    if (currentStep === 3) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, navigate]);

  const fetchAddresses = useCallback(async () => {
    const response = await getUserAddresses();
    if (response.success) {
      setAddresses(response.data);
      const defaultAddr = response.data.find((addr) => addr.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      } else if (response.data.length > 0) {
        setSelectedAddress(response.data[0]);
      }
    }
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress) {
      return;
    }

    if (isCreatingOrder.current || orderId) {
      return;
    }

    isCreatingOrder.current = true;
    setIsProcessing(true);

    try {
      const orderData = {
        total,
        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          price: item.price,
        })),
        address: {
          name: selectedAddress.full_name,
          phone: selectedAddress.phone,
          street:
            selectedAddress.address_line1 +
            (selectedAddress.address_line2
              ? ', ' + selectedAddress.address_line2
              : ''),
          city: selectedAddress.city,
          state: selectedAddress.state,
          pin: selectedAddress.pincode,
          full_name: selectedAddress.full_name,
          address_line1: selectedAddress.address_line1,
          address_line2: selectedAddress.address_line2,
          landmark: selectedAddress.landmark,
          pincode: selectedAddress.pincode,
        },
        paymentMethod: 'upi',
      };

      const result = await createOrder(orderData);

      if (result.success) {
        setOrderId(result.data.id);
        setCurrentStep(2);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      isCreatingOrder.current = false;
      setIsProcessing(false);
    }
  }, [selectedAddress, orderId, total, cart]);

  const handlePaymentConfirmation = useCallback(async () => {
    if (!orderId || isConfirmingPayment.current) {
      return;
    }

    isConfirmingPayment.current = true;
    setIsProcessing(true);

    try {
      const result = await markPaymentAsPaid(orderId, transactionId);

      if (result.success) {
        clearCart();
        setCurrentStep(3);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      isConfirmingPayment.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, transactionId, clearCart]);

  return (
    <>
      <SEO
        title="Checkout - Stryng Clothing"
        description="Complete your order securely"
      />

      <div className="modern-checkout-page">
        <div className="checkout-container">
          {/* Mobile Header */}
          <div className="checkout-mobile-header">
            <button
              className="back-button"
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/cart')}
              aria-label="Go back"
            >
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <h1>Checkout</h1>
            <div className="header-spacer" />
          </div>

          {/* Progress Indicator */}
          <div className="modern-progress">
            <div className="progress-steps">
              <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 1 ? <Check size={16} /> : <MapPin size={16} />}
                </div>
                <span className="step-label">Address</span>
              </div>
              <div className={`progress-line ${currentStep > 1 ? 'completed' : ''}`} />
              <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 2 ? <Check size={16} /> : <CreditCard size={16} />}
                </div>
                <span className="step-label">Payment</span>
              </div>
              <div className={`progress-line ${currentStep > 2 ? 'completed' : ''}`} />
              <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                <div className="step-circle">
                  <CheckCircle2 size={16} />
                </div>
                <span className="step-label">Done</span>
              </div>
            </div>
          </div>

          <div className="checkout-layout">
            {/* Main Content */}
            <div className="checkout-main-content">
              {/* Step 1: Address Selection */}
              {currentStep === 1 && (
                <div className="checkout-card">
                  <div className="card-header">
                    <div className="header-title">
                      <MapPin size={24} />
                      <h2>Delivery Address</h2>
                    </div>
                    <Link to="/addresses" className="add-address-btn">
                      <Plus size={18} />
                      <span className="btn-text-desktop">Add New</span>
                    </Link>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="empty-addresses">
                      <div className="empty-icon">
                        <MapPin size={48} />
                      </div>
                      <h3>No addresses saved</h3>
                      <p>Add a delivery address to continue with your order</p>
                      <Link to="/addresses" className="btn-primary-large">
                        <Plus size={20} /> Add Address
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="address-grid">
                        {addresses.map((address) => (
                          <AddressCard
                            key={address.id}
                            address={address}
                            isSelected={selectedAddress?.id === address.id}
                            onSelect={handleAddressSelect}
                          />
                        ))}
                      </div>

                      <button
                        onClick={handlePlaceOrder}
                        className="btn-primary-large checkout-continue-btn"
                        disabled={!selectedAddress || isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader size={20} className="btn-spinner" />
                            Reserving Stock...
                          </>
                        ) : (
                          <>
                            Continue to Payment
                            <ChevronRight size={20} />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div className="checkout-card">
                  <div className="card-header">
                    <div className="header-title">
                      <CreditCard size={24} />
                      <h2>Payment</h2>
                    </div>
                    <div className="order-id-badge">
                      Order #{orderId?.slice(-8)}
                    </div>
                  </div>

                  <div className="payment-container">
                    {/* QR Code Section */}
                    <div className="payment-method-card">
                      <div className="method-header">
                        <h3>Scan QR Code</h3>
                        <span className="recommended-badge">Recommended</span>
                      </div>
                      <div className="qr-wrapper">
                        <img
                          src={qrCodeUrl}
                          alt="UPI QR Code"
                          className="qr-image"
                        />
                      </div>
                      <p className="payment-hint">
                        Scan with any UPI app (GPay, PhonePe, Paytm)
                      </p>
                    </div>

                    <div className="payment-divider">
                      <span>OR</span>
                    </div>

                    {/* UPI ID Section */}
                    <div className="payment-method-card">
                      <h3>Pay via UPI ID</h3>
                      <div className="upi-id-container">
                        <div className="upi-id-display">
                          <span className="upi-text">{MERCHANT_VPA}</span>
                          <button
                            onClick={copyUPIId}
                            className="copy-btn"
                            title="Copy UPI ID"
                          >
                            {copiedUPI ? (
                              <Check size={18} className="success-icon" />
                            ) : (
                              <Copy size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="payment-amount-display">
                        <span>Amount to pay</span>
                        <strong>{formattedTotal}</strong>
                      </div>
                      <a
                        href={upiLink}
                        className="btn-secondary-large"
                      >
                        <ExternalLink size={18} />
                        Open UPI App
                      </a>
                    </div>

                    {/* Transaction ID Input */}
                    <div className="transaction-section">
                      <h3>After Payment</h3>
                      <div className="input-group">
                        <label htmlFor="transaction-id">
                          UPI Transaction ID (Optional)
                        </label>
                        <input
                          id="transaction-id"
                          type="text"
                          className="modern-input"
                          placeholder="e.g., 123456789012"
                          value={transactionId}
                          onChange={handleTransactionIdChange}
                        />
                        <small className="input-hint">
                          Helps us verify your payment faster
                        </small>
                      </div>

                      <button
                        onClick={handlePaymentConfirmation}
                        className="btn-primary-large"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
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

                      <div className="payment-security">
                        <Shield size={16} />
                        <span>Your payment is secure and encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {currentStep === 3 && (
                <div className="checkout-card success-card">
                  <div className="success-animation">
                    <div className="success-checkmark">
                      <CheckCircle2 size={64} />
                    </div>
                  </div>
                  <h2 className="success-title">Order Placed Successfully!</h2>
                  <p className="success-order-id">
                    Order ID: <strong>#{orderId}</strong>
                  </p>
                  <p className="success-message">
                    Thank you for shopping with us! We'll verify your payment
                    and send you a confirmation email shortly.
                  </p>

                  <div className="success-actions">
                    <Link to={`/order/${orderId}`} className="btn-primary-large">
                      <Package size={20} />
                      Track Order
                    </Link>
                    <Link to="/products" className="btn-secondary-large">
                      Continue Shopping
                    </Link>
                  </div>

                  <div className="success-info-card">
                    <h4>What happens next?</h4>
                    <ul className="success-steps">
                      <li>
                        <Check size={16} />
                        <span>Payment verification (1-2 hours)</span>
                      </li>
                      <li>
                        <Check size={16} />
                        <span>Order confirmation email</span>
                      </li>
                      <li>
                        <Check size={16} />
                        <span>Order processing & packaging</span>
                      </li>
                      <li>
                        <Check size={16} />
                        <span>Shipment & delivery tracking</span>
                      </li>
                    </ul>
                  </div>

                  <div className="redirect-notice">
                    <Clock size={16} />
                    <span>
                      Redirecting to home in <strong>{countdown}s</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="checkout-sidebar">
              <div className="summary-card">
                <div className="summary-header">
                  <h3>Order Summary</h3>
                  <span className="item-count">{cart.length} items</span>
                </div>

                <div className="summary-items">
                  {cart.map((item) => (
                    <OrderItem key={item.cartId} item={item} isCompact />
                  ))}
                </div>

                <div className="summary-totals">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>{formattedSubtotal}</span>
                  </div>
                  <div className="total-row">
                    <span>Shipping</span>
                    <span className="free-text">FREE</span>
                  </div>
                  <div className="total-row">
                    <span>Tax (GST 18%)</span>
                    <span>{formattedTax}</span>
                  </div>
                  <div className="total-row grand-total">
                    <span>Total</span>
                    <span>{formattedTotal}</span>
                  </div>
                </div>

                {selectedAddress && currentStep === 1 && (
                  <div className="delivery-info">
                    <div className="delivery-header">
                      <Truck size={18} />
                      <span>Delivering to</span>
                    </div>
                    <div className="delivery-address">
                      <strong>{selectedAddress.full_name}</strong>
                      <p>
                        {selectedAddress.address_line1}, {selectedAddress.city}
                      </p>
                      <p>
                        {selectedAddress.state} - {selectedAddress.pincode}
                      </p>
                    </div>
                  </div>
                )}

                <div className="trust-badges">
                  <div className="trust-item">
                    <Shield size={16} />
                    <span>Secure Payment</span>
                  </div>
                  <div className="trust-item">
                    <Truck size={16} />
                    <span>Free Shipping</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Summary Toggle */}
          <div className="mobile-summary-toggle">
            <button
              className="summary-toggle-btn"
              onClick={toggleSummary}
            >
              <div className="toggle-content">
                <Package size={18} />
                <span>Order Summary</span>
                <span className="toggle-total">{formattedTotal}</span>
              </div>
              <ChevronRight
                size={20}
                style={{
                  transform: showSummary ? 'rotate(90deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </button>

            {showSummary && (
              <div className="mobile-summary-dropdown">
                <div className="summary-items">
                  {cart.map((item) => (
                    <OrderItem key={item.cartId} item={item} />
                  ))}
                </div>

                <div className="summary-totals">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>{formattedSubtotal}</span>
                  </div>
                  <div className="total-row">
                    <span>Shipping</span>
                    <span className="free-text">FREE</span>
                  </div>
                  <div className="total-row">
                    <span>Tax (GST 18%)</span>
                    <span>{formattedTax}</span>
                  </div>
                  <div className="total-row grand-total">
                    <span>Total</span>
                    <span>{formattedTotal}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

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
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/format';
import { trackBeginCheckout } from '../lib/analytics';
import { getUserAddresses } from '../api/addresses.api';
import { createOrder, markPaymentAsPaid } from '../api/orders.api';
import {
  reserveInventory,
  releaseReservation,
  checkAvailableStock,
} from '../lib/inventory';
import SEO from '../components/SEO';

// UPI Configuration
const MERCHANT_VPA = 'kurmikapil154@okicici';
const MERCHANT_NAME = 'Stryng Clothing';
const RESERVATION_TIMEOUT = 15; // minutes

// Memoized AddressCard component
const AddressCard = memo(({ address, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(address);
  }, [address, onSelect]);

  return (
    <div
      className={`address-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="address-card__radio">
        {isSelected && <Check size={16} />}
      </div>
      <div className="address-card__content">
        <h4>{address.full_name}</h4>
        <p>{address.address_line1}</p>
        {address.address_line2 && (
          <p>{address.address_line2}</p>
        )}
        {address.landmark && (
          <p>Landmark: {address.landmark}</p>
        )}
        <p>
          {address.city}, {address.state} -{' '}
          {address.pincode}
        </p>
        <p>Phone: {address.phone}</p>
        {address.is_default && (
          <span className="badge badge--success">
            Default
          </span>
        )}
      </div>
    </div>
  );
});

AddressCard.displayName = 'AddressCard';

// Memoized OrderItem component
const OrderItem = memo(({ item }) => {
  const itemTotal = useMemo(
    () => formatPrice(item.price * item.quantity),
    [item.price, item.quantity]
  );

  return (
    <div className="order-item">
      <img
        src={item.images[0]}
        alt={item.name}
        className="order-item__image"
      />
      <div className="order-item__details">
        <h4>{item.name}</h4>
        <p>
          Size: {item.selectedSize} | Color:{' '}
          {item.selectedColor?.name}
        </p>
        <p>Qty: {item.quantity}</p>
      </div>
      <div className="order-item__price">
        {itemTotal}
      </div>
    </div>
  );
});

OrderItem.displayName = 'OrderItem';

export default function CheckoutOptimized() {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart, showToast, user } = useStore();

  // Prevent double submission
  const isCreatingOrder = useRef(false);
  const isConfirmingPayment = useRef(false);
  const reservationIds = useRef([]);
  const reservationTimer = useRef(null);

  // State
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [stockError, setStockError] = useState(null);
  const [reservationTimeLeft, setReservationTimeLeft] = useState(
    RESERVATION_TIMEOUT * 60
  );

  // Cart Calculations - memoized for performance
  const subtotal = useMemo(
    () => getCartTotal(),
    [getCartTotal]
  );

  const shippingCost = 0;

  const tax = useMemo(
    () => Math.round(subtotal * 0.18),
    [subtotal]
  );

  const total = useMemo(
    () => subtotal + shippingCost + tax,
    [subtotal, shippingCost, tax]
  );

  const formattedSubtotal = useMemo(
    () => formatPrice(subtotal),
    [subtotal]
  );

  const formattedTax = useMemo(
    () => formatPrice(tax),
    [tax]
  );

  const formattedTotal = useMemo(
    () => formatPrice(total),
    [total]
  );

  // UPI Payment Link - memoized
  const upiLink = useMemo(
    () => `upi://pay?pa=${MERCHANT_VPA}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=Order Payment`,
    [total]
  );

  const qrCodeUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`,
    [upiLink]
  );

  const reservationTimeFormatted = useMemo(
    () => formatTime(reservationTimeLeft),
    [reservationTimeLeft]
  );

  // Memoize event handlers
  const handleAddressSelect = useCallback((address) => {
    setSelectedAddress(address);
  }, []);

  const copyUPIId = useCallback(() => {
    navigator.clipboard.writeText(MERCHANT_VPA);
    setCopiedUPI(true);
    showToast('UPI ID copied!', 'success');
    setTimeout(() => setCopiedUPI(false), 2000);
  }, [showToast]);

  const handleTransactionIdChange = useCallback((e) => {
    setTransactionId(e.target.value);
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup reservations on unmount
  useEffect(() => {
    return () => {
      // Release all reservations when leaving checkout
      if (reservationIds.current.length > 0 && currentStep !== 3) {
        reservationIds.current.forEach((id) => {
          releaseReservation(id).catch(console.error);
        });
      }
      if (reservationTimer.current) {
        clearInterval(reservationTimer.current);
      }
    };
  }, [currentStep]);

  // Redirect if empty cart or not logged in
  useEffect(() => {
    if (!user) {
      showToast('Please login to checkout', 'error');
      navigate('/login');
      return;
    }

    if (cart.length === 0 && currentStep !== 3) {
      navigate('/cart');
      return;
    }

    // Track begin checkout
    if (cart.length > 0) {
      trackBeginCheckout(cart, total);
    }

    // Fetch addresses
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

  // Reservation countdown timer
  useEffect(() => {
    if (currentStep === 2 && reservationTimeLeft > 0) {
      reservationTimer.current = setInterval(() => {
        setReservationTimeLeft((prev) => {
          if (prev <= 1) {
            // Reservation expired
            showToast('Reservation expired. Please try again.', 'error');
            navigate('/cart');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (reservationTimer.current) {
          clearInterval(reservationTimer.current);
        }
      };
    }
  }, [currentStep, reservationTimeLeft, navigate]);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);

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

    setLoading(false);
  }, []);

  const validateAndReserveStock = useCallback(async () => {
    setStockError(null);

    // Check and reserve stock for all items
    for (const item of cart) {
      // First check available stock
      const stockCheck = await checkAvailableStock(item.id);

      if (!stockCheck.success || stockCheck.availableStock < item.quantity) {
        setStockError({
          productName: item.name,
          requested: item.quantity,
          available: stockCheck.availableStock || 0,
        });
        return false;
      }

      // Reserve inventory
      const reservation = await reserveInventory(
        item.id,
        user.id,
        item.quantity,
        RESERVATION_TIMEOUT
      );

      if (!reservation.success) {
        setStockError({
          productName: item.name,
          requested: item.quantity,
          available: reservation.available || 0,
        });

        // Release any successful reservations
        for (const resId of reservationIds.current) {
          await releaseReservation(resId);
        }
        reservationIds.current = [];

        return false;
      }

      reservationIds.current.push(reservation.reservationId);
    }

    return true;
  }, [cart, user]);

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress) {
      showToast('Please select a delivery address', 'error');
      return;
    }

    if (isCreatingOrder.current || orderId) {
      return;
    }

    isCreatingOrder.current = true;
    setIsProcessing(true);
    setStockError(null);

    try {
      // Step 1: Validate and reserve inventory
      const stockReserved = await validateAndReserveStock();

      if (!stockReserved) {
        throw new Error('Unable to reserve inventory');
      }

      // Step 2: Create order (atomic operation)
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
        showToast('Order created! Please complete payment', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      showToast(error.message || 'Failed to create order', 'error');

      // Release reservations on error
      for (const resId of reservationIds.current) {
        await releaseReservation(resId);
      }
      reservationIds.current = [];

      isCreatingOrder.current = false;
      setIsProcessing(false);
    } finally {
      if (!orderId) {
        setIsProcessing(false);
      }
    }
  }, [selectedAddress, orderId, showToast, validateAndReserveStock, total, cart]);

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
        showToast('Payment confirmation received!', 'success');

        // Clear reservation timer
        if (reservationTimer.current) {
          clearInterval(reservationTimer.current);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      showToast(error.message || 'Failed to confirm payment', 'error');
      isConfirmingPayment.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, transactionId, clearCart, showToast]);

  if (loading) {
    return (
      <div className="page">
        <div
          className="container"
          style={{ padding: '4rem 0', textAlign: 'center' }}
        >
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p
            style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}
          >
            Loading checkout...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Checkout - Stryng Clothing"
        description="Complete your order"
      />

      <div className="page">
        <div className="container" style={{ padding: '3rem 0' }}>
          {/* Stock Error Alert */}
          {stockError && (
            <div
              className="alert alert--error"
              style={{ marginBottom: '2rem' }}
            >
              <AlertCircle size={20} />
              <div>
                <strong>Stock Unavailable</strong>
                <p>
                  {stockError.productName}: Only {stockError.available}{' '}
                  available, but you requested {stockError.requested}. Please
                  update your cart.
                </p>
              </div>
              <Link to="/cart" className="btn btn--sm btn--secondary">
                Update Cart
              </Link>
            </div>
          )}

          {/* Reservation Timer */}
          {currentStep === 2 && (
            <div className="reservation-timer">
              <AlertCircle size={18} />
              <span>
                Complete payment within:{' '}
                <strong>{reservationTimeFormatted}</strong>
              </span>
            </div>
          )}

          {/* Progress Steps */}
          <div className="checkout-steps">
            <div
              className={`checkout-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
            >
              <div className="checkout-step__number">
                {currentStep > 1 ? <Check size={16} /> : '1'}
              </div>
              <span className="checkout-step__label">Address</span>
            </div>
            <div className="checkout-step__line"></div>
            <div
              className={`checkout-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
            >
              <div className="checkout-step__number">
                {currentStep > 2 ? <Check size={16} /> : '2'}
              </div>
              <span className="checkout-step__label">Payment</span>
            </div>
            <div className="checkout-step__line"></div>
            <div
              className={`checkout-step ${currentStep >= 3 ? 'active' : ''}`}
            >
              <div className="checkout-step__number">3</div>
              <span className="checkout-step__label">Confirmation</span>
            </div>
          </div>

          <div className="checkout-grid">
            {/* Main Content */}
            <div className="checkout-main">
              {/* Step 1: Address Selection */}
              {currentStep === 1 && (
                <div className="checkout-section">
                  <div className="checkout-section__header">
                    <h2>Select Delivery Address</h2>
                    <Link
                      to="/addresses"
                      className="btn btn--secondary btn--sm"
                    >
                      <Plus size={16} /> Add New Address
                    </Link>
                  </div>

                  {addresses.length === 0 ? (
                    <div
                      className="empty-state"
                      style={{ padding: '3rem 2rem' }}
                    >
                      <MapPin
                        size={48}
                        style={{ opacity: 0.5, marginBottom: '1rem' }}
                      />
                      <h3>No addresses saved</h3>
                      <p>Add a delivery address to continue</p>
                      <Link
                        to="/addresses"
                        className="btn btn--primary"
                        style={{ marginTop: '1rem' }}
                      >
                        <Plus size={18} /> Add Address
                      </Link>
                    </div>
                  ) : (
                    <div className="address-list">
                      {addresses.map((address) => (
                        <AddressCard
                          key={address.id}
                          address={address}
                          isSelected={selectedAddress?.id === address.id}
                          onSelect={handleAddressSelect}
                        />
                      ))}
                    </div>
                  )}

                  {addresses.length > 0 && (
                    <button
                      onClick={handlePlaceOrder}
                      className="btn btn--primary btn--lg"
                      style={{ width: '100%', marginTop: '2rem' }}
                      disabled={!selectedAddress || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader size={18} className="spinner" /> Reserving
                          Stock...
                        </>
                      ) : (
                        'Continue to Payment'
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div className="checkout-section">
                  <h2>Complete Payment</h2>
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      marginBottom: '2rem',
                    }}
                  >
                    Order ID: <strong>{orderId}</strong>
                  </p>

                  <div className="payment-section">
                    <div className="payment-qr">
                      <h3>Scan QR Code</h3>
                      <div className="qr-code-container">
                        <img
                          src={qrCodeUrl}
                          alt="UPI QR Code"
                          className="qr-code"
                        />
                      </div>
                      <p className="payment-instruction">
                        Scan with any UPI app (Google Pay, PhonePe, Paytm, etc.)
                      </p>
                    </div>

                    <div className="payment-divider">OR</div>

                    <div className="payment-upi">
                      <h3>Pay via UPI ID</h3>
                      <div className="upi-id-box">
                        <span className="upi-id">{MERCHANT_VPA}</span>
                        <button
                          onClick={copyUPIId}
                          className="btn-icon"
                          title="Copy UPI ID"
                        >
                          {copiedUPI ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                      <p className="payment-amount">
                        Amount to pay: <strong>{formattedTotal}</strong>
                      </p>
                      <a
                        href={upiLink}
                        className="btn btn--secondary"
                        style={{ width: '100%', marginTop: '1rem' }}
                      >
                        <ExternalLink size={18} /> Open UPI App
                      </a>
                    </div>

                    <div className="payment-confirmation">
                      <h3>After Payment</h3>
                      <div className="form-group">
                        <label>UPI Transaction ID (Optional)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Enter transaction ID"
                          value={transactionId}
                          onChange={handleTransactionIdChange}
                        />
                        <small style={{ color: 'var(--color-text-secondary)' }}>
                          Helps us verify your payment faster
                        </small>
                      </div>

                      <button
                        onClick={handlePaymentConfirmation}
                        className="btn btn--primary btn--lg"
                        style={{ width: '100%' }}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader size={18} className="spinner" />{' '}
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check size={18} /> I Have Paid
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 3 && (
                <div className="checkout-section">
                  <div className="order-success">
                    <div className="success-icon-animated">
                      <div className="success-checkmark">
                        <Check size={48} />
                      </div>
                    </div>
                    <h2 className="success-title">
                      Order Placed Successfully!
                    </h2>
                    <p className="order-id">
                      Order ID: <strong>{orderId}</strong>
                    </p>
                    <p className="success-message">
                      Thank you for your order! We'll verify your payment and
                      send you a confirmation email shortly.
                    </p>

                    <div className="success-actions">
                      <Link
                        to={`/order/${orderId}`}
                        className="btn btn--primary"
                      >
                        Track Order
                      </Link>
                      <Link to="/products" className="btn btn--secondary">
                        Continue Shopping
                      </Link>
                    </div>

                    <div className="success-info">
                      <h4>What's Next?</h4>
                      <ul>
                        <li>✓ We'll verify your payment within 1-2 hours</li>
                        <li>✓ You'll receive an order confirmation email</li>
                        <li>✓ Your order will be processed and shipped</li>
                        <li>✓ Track your order anytime from your account</li>
                      </ul>
                    </div>

                    <p className="redirect-message">
                      Redirecting to home page in{' '}
                      <span className="countdown">{countdown}</span> seconds...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="checkout-sidebar">
              <div className="order-summary">
                <h3>Order Summary</h3>

                <div className="order-items">
                  {cart.map((item) => (
                    <OrderItem key={item.cartId} item={item} />
                  ))}
                </div>

                <div className="order-totals">
                  <div className="order-total-row">
                    <span>Subtotal</span>
                    <span>{formattedSubtotal}</span>
                  </div>
                  <div className="order-total-row">
                    <span>Shipping</span>
                    <span className="free-badge">FREE</span>
                  </div>
                  <div className="order-total-row">
                    <span>Tax (18%)</span>
                    <span>{formattedTax}</span>
                  </div>
                  <div className="order-total-row total">
                    <span>Total</span>
                    <span>{formattedTotal}</span>
                  </div>
                </div>

                {selectedAddress && currentStep === 1 && (
                  <div className="delivery-address">
                    <h4>Delivering to:</h4>
                    <p>
                      <strong>{selectedAddress.full_name}</strong>
                    </p>
                    <p>{selectedAddress.address_line1}</p>
                    <p>
                      {selectedAddress.city}, {selectedAddress.state} -{' '}
                      {selectedAddress.pincode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
                .reservation-timer {
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border: 2px solid #f59e0b;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                    color: #92400e;
                    font-weight: 500;
                }

                .reservation-timer strong {
                    color: #b45309;
                    font-size: 1.125rem;
                }

                .alert {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                }

                .alert--error {
                    background: #fee2e2;
                    border: 2px solid #dc2626;
                    color: #991b1b;
                }

                .alert strong {
                    display: block;
                    margin-bottom: 0.25rem;
                }

                .alert p {
                    margin: 0;
                    font-size: 0.9375rem;
                }
            `}</style>
    </>
  );
}

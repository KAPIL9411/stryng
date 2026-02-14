import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Plus, Check, Loader, Copy, ExternalLink } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../lib/dummyData';
import { trackBeginCheckout } from '../lib/analytics';
import { getUserAddresses } from '../api/addresses.api';
import { createOrder, markPaymentAsPaid } from '../api/orders.api';
import SEO from '../components/SEO';

// UPI Configuration
const MERCHANT_VPA = 'kurmikapil154@okicici';
const MERCHANT_NAME = 'Stryng Clothing';

export default function CheckoutNew() {
    const navigate = useNavigate();
    const { cart, getCartTotal, clearCart, showToast, user } = useStore();
    
    // Use ref to prevent double submission
    const isCreatingOrder = useRef(false);
    const isConfirmingPayment = useRef(false);

    // State
    const [loading, setLoading] = useState(true);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [currentStep, setCurrentStep] = useState(1); // 1: Address, 2: Payment, 3: Confirmation
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const [copiedUPI, setCopiedUPI] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Cart Calculations
    const subtotal = getCartTotal();
    const shippingCost = 0; // Free shipping
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shippingCost + tax;

    // UPI Payment Link
    const upiLink = `upi://pay?pa=${MERCHANT_VPA}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=Order Payment`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;

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

    // Countdown and redirect after order success
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

    const fetchAddresses = async () => {
        setLoading(true);
        
        // Get all addresses
        const response = await getUserAddresses();
        if (response.success) {
            setAddresses(response.data);
            
            // Set default address if exists
            const defaultAddr = response.data.find(addr => addr.is_default);
            if (defaultAddr) {
                setSelectedAddress(defaultAddr);
            } else if (response.data.length > 0) {
                setSelectedAddress(response.data[0]);
            }
        }
        
        setLoading(false);
    };

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            showToast('Please select a delivery address', 'error');
            return;
        }

        // Prevent double submission using ref (works even in StrictMode)
        if (isCreatingOrder.current || orderId) {
            console.log('Order already being processed or created');
            return;
        }

        isCreatingOrder.current = true;
        setIsProcessing(true);

        try {
            // Create order
            const orderData = {
                total,
                items: cart,
                address: {
                    name: selectedAddress.full_name,
                    phone: selectedAddress.phone,
                    street: selectedAddress.address_line1 + (selectedAddress.address_line2 ? ', ' + selectedAddress.address_line2 : ''),
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    pin: selectedAddress.pincode,
                    // Keep new format for compatibility
                    full_name: selectedAddress.full_name,
                    address_line1: selectedAddress.address_line1,
                    address_line2: selectedAddress.address_line2,
                    landmark: selectedAddress.landmark,
                    pincode: selectedAddress.pincode
                },
                transactionId: ''
            };

            const result = await createOrder(orderData);

            if (result.success) {
                setOrderId(result.data.id);
                setCurrentStep(2); // Move to payment step
                showToast('Order created! Please complete payment', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error creating order:', error);
            showToast(error.message || 'Failed to create order', 'error');
            isCreatingOrder.current = false; // Reset on error
            setIsProcessing(false);
        } finally {
            // Keep button disabled after success, only re-enable on error
            if (!orderId) {
                setIsProcessing(false);
            }
        }
    };

    const handlePaymentConfirmation = async () => {
        if (!orderId) return;

        // Prevent double submission using ref
        if (isConfirmingPayment.current) {
            console.log('Payment confirmation already in progress');
            return;
        }

        isConfirmingPayment.current = true;
        setIsProcessing(true);

        try {
            // Mark payment as paid
            const result = await markPaymentAsPaid(orderId, transactionId);

            if (result.success) {
                // Clear cart
                clearCart();
                
                // Move to confirmation step
                setCurrentStep(3);
                showToast('Payment confirmation received!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            showToast(error.message || 'Failed to confirm payment', 'error');
            isConfirmingPayment.current = false; // Reset on error
        } finally {
            setIsProcessing(false);
        }
    };

    const copyUPIId = () => {
        navigator.clipboard.writeText(MERCHANT_VPA);
        setCopiedUPI(true);
        showToast('UPI ID copied!', 'success');
        setTimeout(() => setCopiedUPI(false), 2000);
    };

    if (loading) {
        return (
            <div className="page">
                <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
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
                    {/* Progress Steps */}
                    <div className="checkout-steps">
                        <div className={`checkout-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                            <div className="checkout-step__number">
                                {currentStep > 1 ? <Check size={16} /> : '1'}
                            </div>
                            <span className="checkout-step__label">Address</span>
                        </div>
                        <div className="checkout-step__line"></div>
                        <div className={`checkout-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                            <div className="checkout-step__number">
                                {currentStep > 2 ? <Check size={16} /> : '2'}
                            </div>
                            <span className="checkout-step__label">Payment</span>
                        </div>
                        <div className="checkout-step__line"></div>
                        <div className={`checkout-step ${currentStep >= 3 ? 'active' : ''}`}>
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
                                        <Link to="/addresses" className="btn btn--secondary btn--sm">
                                            <Plus size={16} /> Add New Address
                                        </Link>
                                    </div>

                                    {addresses.length === 0 ? (
                                        <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                                            <MapPin size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                            <h3>No addresses saved</h3>
                                            <p>Add a delivery address to continue</p>
                                            <Link to="/addresses" className="btn btn--primary" style={{ marginTop: '1rem' }}>
                                                <Plus size={18} /> Add Address
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="address-list">
                                            {addresses.map((address) => (
                                                <div
                                                    key={address.id}
                                                    className={`address-card ${selectedAddress?.id === address.id ? 'selected' : ''}`}
                                                    onClick={() => setSelectedAddress(address)}
                                                >
                                                    <div className="address-card__radio">
                                                        {selectedAddress?.id === address.id && <Check size={16} />}
                                                    </div>
                                                    <div className="address-card__content">
                                                        <h4>{address.full_name}</h4>
                                                        <p>{address.address_line1}</p>
                                                        {address.address_line2 && <p>{address.address_line2}</p>}
                                                        {address.landmark && <p>Landmark: {address.landmark}</p>}
                                                        <p>{address.city}, {address.state} - {address.pincode}</p>
                                                        <p>Phone: {address.phone}</p>
                                                        {address.is_default && (
                                                            <span className="badge badge--success">Default</span>
                                                        )}
                                                    </div>
                                                </div>
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
                                                    <Loader size={18} className="spinner" /> Processing...
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
                                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                                        Order ID: <strong>{orderId}</strong>
                                    </p>

                                    <div className="payment-section">
                                        <div className="payment-qr">
                                            <h3>Scan QR Code</h3>
                                            <div className="qr-code-container">
                                                <img src={qrCodeUrl} alt="UPI QR Code" className="qr-code" />
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
                                                <button onClick={copyUPIId} className="btn-icon" title="Copy UPI ID">
                                                    {copiedUPI ? <Check size={18} /> : <Copy size={18} />}
                                                </button>
                                            </div>
                                            <p className="payment-amount">
                                                Amount to pay: <strong>{formatPrice(total)}</strong>
                                            </p>
                                            <a href={upiLink} className="btn btn--secondary" style={{ width: '100%', marginTop: '1rem' }}>
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
                                                    onChange={(e) => setTransactionId(e.target.value)}
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
                                                        <Loader size={18} className="spinner" /> Processing...
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
                                        <h2 className="success-title">Order Placed Successfully!</h2>
                                        <p className="order-id">Order ID: <strong>{orderId}</strong></p>
                                        <p className="success-message">
                                            Thank you for your order! We'll verify your payment and send you a confirmation email shortly.
                                        </p>

                                        <div className="success-actions">
                                            <Link to={`/order-tracking?id=${orderId}`} className="btn btn--primary">
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
                                            Redirecting to home page in <span className="countdown">{countdown}</span> seconds...
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
                                        <div key={`${item.id}-${item.size}-${item.color?.name}`} className="order-item">
                                            <img src={item.images[0]} alt={item.name} className="order-item__image" />
                                            <div className="order-item__details">
                                                <h4>{item.name}</h4>
                                                <p>Size: {item.size} | Color: {item.color?.name}</p>
                                                <p>Qty: {item.quantity}</p>
                                            </div>
                                            <div className="order-item__price">
                                                {formatPrice(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="order-totals">
                                    <div className="order-total-row">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="order-total-row">
                                        <span>Shipping</span>
                                        <span className="free-badge">FREE</span>
                                    </div>
                                    <div className="order-total-row">
                                        <span>Tax (18%)</span>
                                        <span>{formatPrice(tax)}</span>
                                    </div>
                                    <div className="order-total-row total">
                                        <span>Total</span>
                                        <span>{formatPrice(total)}</span>
                                    </div>
                                </div>

                                {selectedAddress && currentStep === 1 && (
                                    <div className="delivery-address">
                                        <h4>Delivering to:</h4>
                                        <p><strong>{selectedAddress.full_name}</strong></p>
                                        <p>{selectedAddress.address_line1}</p>
                                        <p>{selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .checkout-steps {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 3rem;
                    padding: 2rem 0;
                }

                .checkout-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }

                .checkout-step__number {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid var(--color-border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: var(--font-semibold);
                    color: var(--color-text-secondary);
                    background: var(--color-bg-primary);
                    transition: all 0.3s ease;
                }

                .checkout-step.active .checkout-step__number {
                    border-color: var(--color-text-primary);
                    color: var(--color-text-primary);
                    background: var(--color-text-primary);
                    color: white;
                }

                .checkout-step.completed .checkout-step__number {
                    border-color: var(--color-accent);
                    background: var(--color-accent);
                    color: var(--color-text-primary);
                }

                .checkout-step__label {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                }

                .checkout-step.active .checkout-step__label {
                    color: var(--color-text-primary);
                    font-weight: var(--font-semibold);
                }

                .checkout-step__line {
                    width: 100px;
                    height: 2px;
                    background: var(--color-border);
                    margin: 0 1rem;
                }

                .checkout-grid {
                    display: grid;
                    grid-template-columns: 1fr 400px;
                    gap: 2rem;
                }

                .checkout-section {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    padding: 2rem;
                    border-radius: 0;
                }

                .checkout-section__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 2rem;
                }

                .checkout-section h2 {
                    font-size: 1.5rem;
                    margin: 0 0 1rem 0;
                }

                .address-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .address-card {
                    display: flex;
                    gap: 1rem;
                    padding: 1.5rem;
                    border: 2px solid var(--color-border);
                    border-radius: 0;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .address-card:hover {
                    border-color: var(--color-text-primary);
                }

                .address-card.selected {
                    border-color: var(--color-accent);
                    background: rgba(201, 169, 110, 0.05);
                }

                .address-card__radio {
                    width: 24px;
                    height: 24px;
                    border: 2px solid var(--color-border);
                    border-radius: 50%;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .address-card.selected .address-card__radio {
                    border-color: var(--color-accent);
                    background: var(--color-accent);
                    color: var(--color-text-primary);
                }

                .address-card__content h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.125rem;
                }

                .address-card__content p {
                    margin: 0.25rem 0;
                    font-size: 0.9375rem;
                    color: var(--color-text-secondary);
                }

                .payment-section {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .payment-qr,
                .payment-upi,
                .payment-confirmation {
                    padding: 2rem;
                    border: 1px solid var(--color-border);
                    border-radius: 0;
                }

                .payment-qr h3,
                .payment-upi h3,
                .payment-confirmation h3 {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.125rem;
                }

                .qr-code-container {
                    display: flex;
                    justify-content: center;
                    padding: 1rem;
                    background: white;
                    border: 1px solid var(--color-border);
                }

                .qr-code {
                    width: 250px;
                    height: 250px;
                }

                .payment-instruction {
                    text-align: center;
                    margin-top: 1rem;
                    color: var(--color-text-secondary);
                }

                .payment-divider {
                    text-align: center;
                    color: var(--color-text-secondary);
                    font-weight: var(--font-semibold);
                    position: relative;
                }

                .payment-divider::before,
                .payment-divider::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    width: 45%;
                    height: 1px;
                    background: var(--color-border);
                }

                .payment-divider::before {
                    left: 0;
                }

                .payment-divider::after {
                    right: 0;
                }

                .upi-id-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    margin-bottom: 1rem;
                }

                .upi-id {
                    font-family: monospace;
                    font-size: 1.125rem;
                    font-weight: var(--font-semibold);
                }

                .payment-amount {
                    text-align: center;
                    font-size: 1.25rem;
                    margin: 1rem 0;
                }

                .order-success {
                    text-align: center;
                    padding: 3rem 2rem;
                }

                .success-icon-animated {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 2rem;
                    position: relative;
                    animation: scaleIn 0.5s ease-out;
                }

                @keyframes scaleIn {
                    0% {
                        transform: scale(0);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                .success-checkmark {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: var(--color-accent);
                    color: var(--color-text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: 0 0 0 0 rgba(201, 169, 110, 0.7);
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(201, 169, 110, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 20px rgba(201, 169, 110, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(201, 169, 110, 0);
                    }
                }

                .success-title {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                    animation: fadeInUp 0.6s ease-out 0.2s both;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .order-id {
                    font-size: 1.125rem;
                    margin-bottom: 1rem;
                    animation: fadeInUp 0.6s ease-out 0.3s both;
                }

                .success-message {
                    color: var(--color-text-secondary);
                    margin-bottom: 2rem;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                    line-height: 1.6;
                    animation: fadeInUp 0.6s ease-out 0.4s both;
                }

                .success-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-bottom: 3rem;
                    animation: fadeInUp 0.6s ease-out 0.5s both;
                }

                .success-info {
                    text-align: left;
                    max-width: 500px;
                    margin: 0 auto 2rem;
                    padding: 2rem;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    animation: fadeInUp 0.6s ease-out 0.6s both;
                }

                .success-info h4 {
                    margin: 0 0 1rem 0;
                    font-size: 1.125rem;
                }

                .success-info ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .success-info li {
                    padding: 0.5rem 0;
                    color: var(--color-text-secondary);
                    line-height: 1.6;
                }

                .redirect-message {
                    color: var(--color-text-secondary);
                    font-size: 0.9375rem;
                    margin-top: 2rem;
                    animation: fadeInUp 0.6s ease-out 0.7s both;
                }

                .countdown {
                    font-weight: var(--font-bold);
                    color: var(--color-accent);
                    font-size: 1.125rem;
                }

                .order-summary {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    padding: 2rem;
                    position: sticky;
                    top: 100px;
                }

                .order-summary h3 {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.25rem;
                }

                .order-items {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .order-item {
                    display: flex;
                    gap: 1rem;
                }

                .order-item__image {
                    width: 60px;
                    height: 80px;
                    object-fit: cover;
                }

                .order-item__details {
                    flex: 1;
                }

                .order-item__details h4 {
                    margin: 0 0 0.25rem 0;
                    font-size: 0.9375rem;
                }

                .order-item__details p {
                    margin: 0.125rem 0;
                    font-size: 0.8125rem;
                    color: var(--color-text-secondary);
                }

                .order-item__price {
                    font-weight: var(--font-semibold);
                }

                .order-totals {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                    margin-bottom: 1.5rem;
                }

                .order-total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.9375rem;
                }

                .order-total-row.total {
                    font-size: 1.125rem;
                    font-weight: var(--font-bold);
                    padding-top: 0.75rem;
                    border-top: 1px solid var(--color-border);
                }

                .free-badge {
                    color: var(--color-accent);
                    font-weight: var(--font-semibold);
                }

                .delivery-address {
                    padding: 1rem;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                }

                .delivery-address h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .delivery-address p {
                    margin: 0.25rem 0;
                    font-size: 0.9375rem;
                    color: var(--color-text-secondary);
                }

                @media (max-width: 1024px) {
                    .checkout-grid {
                        grid-template-columns: 1fr;
                    }

                    .order-summary {
                        position: static;
                    }
                }

                @media (max-width: 768px) {
                    .checkout-steps {
                        padding: 1rem 0;
                    }

                    .checkout-step__line {
                        width: 50px;
                        margin: 0 0.5rem;
                    }

                    .checkout-step__label {
                        font-size: 0.75rem;
                    }

                    .checkout-section {
                        padding: 1.5rem;
                    }

                    .success-actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </>
    );
}

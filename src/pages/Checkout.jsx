import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, ChevronLeft, ChevronRight, Smartphone, QrCode, Truck } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../lib/dummyData';

const steps = ['Address', 'Shipping', 'Payment', 'Review'];

// CONFIGURATION (Replace with real values later)
const MERCHANT_VPA = 'kurmikapil154@okicici';
const MERCHANT_NAME = 'Stryng Clothing';

export default function Checkout() {
    const navigate = useNavigate();
    const { cart, getCartTotal, clearCart, showToast, createOrder, user } = useStore();

    // Redirect if empty cart
    useEffect(() => {
        if (cart.length === 0) navigate('/cart');
    }, [cart, navigate]);

    // State
    const [currentStep, setCurrentStep] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: user?.email || '', phone: '',
        address: '', city: '', state: '', zip: '',
        shippingMethod: 'Standard Shipping',
        paymentMethod: 'upi', // Default to Smart UPI
        transactionId: '' // For manual entry if needed, but we focus on "I have paid"
    });

    // Cart Calculations
    const subtotal = getCartTotal();
    const shippingCost = formData.shippingMethod === 'Express Shipping' ? 149 : formData.shippingMethod === 'Same Day Delivery' ? 299 : 0;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shippingCost + tax;

    // UPI Links
    // upi://pay?pa=ADDRESS&pn=NAME&am=AMOUNT&tn=NOTE
    // Note: 'tn' (Transaction Note) can be Order ID, but we generate Order ID at end. 
    // Let's use a temporary timestamp ref for the link.
    const upiLink = `upi://pay?pa=${MERCHANT_VPA}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateStep = (step) => {
        if (step === 0) {
            const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip'];
            const missing = required.filter(f => !formData[f]);
            if (missing.length > 0) {
                showToast(`Please fill in all required fields.`, 'error');
                return false;
            }
            if (formData.phone.length < 10) {
                showToast('Please enter a valid phone number.', 'error');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePlaceOrder = async () => {
        if (!user) {
            showToast('Please login to place an order', 'error');
            navigate('/login');
            return;
        }

        setIsProcessing(true);

        const orderId = `ORD-${Date.now()}`;
        const newOrder = {
            id: orderId,
            total,
            items: cart,
            address: {
                name: `${formData.firstName} ${formData.lastName}`,
                street: formData.address,
                city: formData.city,
                state: formData.state,
                pin: formData.zip,
                phone: formData.phone
            },
            paymentMethod: formData.paymentMethod,
            transactionId: formData.transactionId, // Might be empty for one-tap
            timeline: [
                { status: 'Order Placed', time: new Date().toISOString(), completed: true, current: true },
                { status: 'Order Confirmed', time: '', completed: false },
                { status: 'Shipped', time: '', completed: false },
                { status: 'Out for Delivery', time: '', completed: false },
                { status: 'Delivered', time: '', completed: false },
            ]
        };

        const result = await createOrder(newOrder);

        setIsProcessing(false);

        if (result) {
            clearCart();
            showToast('Order placed successfully!', 'success');
            // Redirect to Success page (we can reuse Order Tracking or a dedicated success page)
            // For now, let's go to Order Tracking but pass a "success" flag state
            navigate(`/order/${orderId}`, { state: { order: newOrder, newOrder: true } });
        }
    };

    if (cart.length === 0) return null; // Handled by useEffect

    return (
        <div className="page">
            <div className="container">
                <h1 style={{ fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: 'var(--space-8)' }}>Checkout</h1>

                {/* Steps */}
                <div className="checkout__steps">
                    {steps.map((step, i) => (
                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div
                                className={`checkout__step ${i === currentStep ? 'checkout__step--active' : ''} ${i < currentStep ? 'checkout__step--completed' : ''}`}
                            >
                                <span className="checkout__step-number">
                                    {i < currentStep ? <Check size={14} /> : i + 1}
                                </span>
                                <span className="hide-mobile">{step}</span>
                            </div>
                            {i < steps.length - 1 && <div className="checkout__step-line" />}
                        </div>
                    ))}
                </div>

                <div className="checkout">
                    {/* Form */}
                    <div className="checkout__form">

                        {/* 1. Address */}
                        {currentStep === 0 && (
                            <>
                                <h2 className="checkout__form-title">Shipping Address</h2>
                                <div className="checkout__form-grid">
                                    <div className="input-group">
                                        <label className="input-group__label">First Name *</label>
                                        <input type="text" name="firstName" className="input" placeholder="John" value={formData.firstName} onChange={handleChange} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-group__label">Last Name *</label>
                                        <input type="text" name="lastName" className="input" placeholder="Doe" value={formData.lastName} onChange={handleChange} />
                                    </div>
                                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-group__label">Email Address *</label>
                                        <input type="email" name="email" className="input" placeholder="john@email.com" value={formData.email} onChange={handleChange} />
                                    </div>
                                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-group__label">Phone Number *</label>
                                        <input type="tel" name="phone" className="input" placeholder="9876543210" value={formData.phone} onChange={handleChange} />
                                    </div>
                                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-group__label">Address *</label>
                                        <input type="text" name="address" className="input" placeholder="Street address" value={formData.address} onChange={handleChange} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-group__label">City *</label>
                                        <input type="text" name="city" className="input" placeholder="Mumbai" value={formData.city} onChange={handleChange} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-group__label">State *</label>
                                        <input type="text" name="state" className="input" placeholder="Maharashtra" value={formData.state} onChange={handleChange} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-group__label">PIN Code *</label>
                                        <input type="text" name="zip" className="input" placeholder="400001" value={formData.zip} onChange={handleChange} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 2. Shipping */}
                        {currentStep === 1 && (
                            <>
                                <h2 className="checkout__form-title">Shipping Method</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    {[
                                        { name: 'Standard Shipping', time: '5-7 business days', price: 0 },
                                        { name: 'Express Shipping', time: '2-3 business days', price: 149 },
                                        { name: 'Same Day Delivery', time: 'Today', price: 299 },
                                    ].map((method) => (
                                        <label key={method.name} className={`payment-method-card ${formData.shippingMethod === method.name ? 'active' : ''}`} style={{
                                            border: formData.shippingMethod === method.name ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            padding: '1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value={method.name}
                                                    checked={formData.shippingMethod === method.name}
                                                    onChange={handleChange}
                                                    style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                                                />
                                                <div>
                                                    <p style={{ fontWeight: '600', marginBottom: '2px' }}>{method.name}</p>
                                                    <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>{method.time}</p>
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: '600' }}>
                                                {method.price === 0 ? 'FREE' : formatPrice(method.price)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* 3. Payment (Smart UPI) */}
                        {currentStep === 2 && (
                            <>
                                <h2 className="checkout__form-title">Payment Method</h2>

                                <div className="checkout__form-grid" style={{ marginBottom: '2rem' }}>
                                    {/* Option 1: UPI */}
                                    <label className="payment-option" style={{
                                        border: formData.paymentMethod === 'upi' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                        backgroundColor: formData.paymentMethod === 'upi' ? 'var(--color-bg-secondary)' : 'transparent'
                                    }}>
                                        <input type="radio" name="paymentMethod" value="upi" checked={formData.paymentMethod === 'upi'} onChange={handleChange} style={{ display: 'none' }} />
                                        <Smartphone size={32} style={{ marginBottom: '0.5rem', color: formData.paymentMethod === 'upi' ? 'var(--color-primary)' : '#666' }} />
                                        <div style={{ fontWeight: '600' }}>UPI / QR</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>GPay, PhonePe, Paytm</div>
                                    </label>

                                    {/* Option 2: COD */}
                                    <label className="payment-option" style={{
                                        border: formData.paymentMethod === 'cod' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                        backgroundColor: formData.paymentMethod === 'cod' ? 'var(--color-bg-secondary)' : 'transparent'
                                    }}>
                                        <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleChange} style={{ display: 'none' }} />
                                        <Truck size={32} style={{ marginBottom: '0.5rem', color: formData.paymentMethod === 'cod' ? 'var(--color-primary)' : '#666' }} />
                                        <div style={{ fontWeight: '600' }}>Cash on Delivery</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Pay when it arrives</div>
                                    </label>
                                </div>

                                {/* UPI Display Area */}
                                {formData.paymentMethod === 'upi' && (
                                    <div className="upi-container" style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--color-border)', borderRadius: '12px', background: '#f9f9f9' }}>
                                        <h3 style={{ marginBottom: '1rem' }}>Scan or Click to Pay {formatPrice(total)}</h3>

                                        {/* QR Code */}
                                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                            <img src={qrCodeUrl} alt="Payment QR" style={{ width: '200px', height: '200px' }} />
                                        </div>

                                        {/* Mobile Button */}
                                        <div className="hide-desktop" style={{ marginTop: '1.5rem' }}>
                                            <a href={upiLink} className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                                                Pay via UPI App
                                            </a>
                                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#666' }}>Tap to open GPay / PhonePe</p>
                                        </div>

                                        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
                                            <strong>Step 1:</strong> Scan QR or Click Button to pay.<br />
                                            <strong>Step 2:</strong> Come back here and click "I Have Paid".
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 4. Review */}
                        {currentStep === 3 && (
                            <>
                                <h2 className="checkout__form-title">Review Order</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    {cart.map((item) => (
                                        <div key={item.cartId} style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3) 0', borderBottom: 'var(--border-thin)' }}>
                                            <img src={item.images[0]} alt={item.name} style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                                            <div>
                                                <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', marginBottom: '2px' }}>{item.name}</p>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Size: {item.selectedSize} | Color: {item.selectedColor?.name} | Qty: {item.quantity}</p>
                                                <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginBottom: 0 }}>{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Shipping To:</h4>
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                                        {formData.firstName} {formData.lastName}<br />
                                        {formData.address}, {formData.city}<br />
                                        {formData.state} - {formData.zip}<br />
                                        {formData.phone}
                                    </p>
                                    <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', marginTop: '1rem' }}>Payment:</h4>
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                                        {formData.paymentMethod === 'upi' ? 'UPI / QR Code' : 'Cash on Delivery'}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
                            <button
                                className="btn btn--secondary"
                                onClick={() => setCurrentStep((c) => Math.max(0, c - 1))}
                                disabled={currentStep === 0}
                                style={{ opacity: currentStep === 0 ? 0.4 : 1 }}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>

                            {/* UPI Confirmation Checkbox */}
                            {currentStep === 3 && formData.paymentMethod === 'upi' && (
                                <div style={{
                                    marginBottom: '1rem', padding: '1rem', background: '#f0fdf4',
                                    border: '1px solid #16a34a', borderRadius: '8px', display: 'flex', gap: '10px'
                                }}>
                                    <input
                                        type="checkbox"
                                        id="payment-confirm"
                                        style={{ width: '20px', height: '20px', accentColor: '#16a34a' }}
                                        checked={formData.paymentConfirmed || false}
                                        onChange={(e) => setFormData(prev => ({ ...prev, paymentConfirmed: e.target.checked }))}
                                    />
                                    <label htmlFor="payment-confirm" style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: '500', cursor: 'pointer' }}>
                                        I confirm that I have transferred <strong>{formatPrice(total)}</strong> to the UPI ID / QR Code above.
                                    </label>
                                </div>
                            )}

                            {currentStep < steps.length - 1 ? (
                                <button className="btn btn--primary" onClick={handleNext}>
                                    Continue <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    className="btn btn--accent btn--lg"
                                    onClick={handlePlaceOrder}
                                    disabled={isProcessing || (formData.paymentMethod === 'upi' && !formData.paymentConfirmed)}
                                    style={{ opacity: (isProcessing || (formData.paymentMethod === 'upi' && !formData.paymentConfirmed)) ? 0.6 : 1 }}
                                >
                                    {isProcessing ? 'Processing...' : (
                                        <>
                                            {formData.paymentMethod === 'upi' ? (
                                                <>Submit Payment <Check size={18} /></>
                                            ) : (
                                                <>Place Order <Lock size={16} /></>
                                            )}
                                            <span style={{ marginLeft: '8px', opacity: 0.8 }}> — {formatPrice(total)}</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="cart-summary">
                        <h3 className="cart-summary__title">Order Summary</h3>
                        {cart.map((item) => (
                            <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0' }}>
                                <span>{item.name} × {item.quantity}</span>
                                <span>{formatPrice(item.price * item.quantity)}</span>
                            </div>
                        ))}
                        <div className="cart-summary__row" style={{ marginTop: 'var(--space-4)', borderTop: 'var(--border-thin)', paddingTop: 'var(--space-4)' }}>
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="cart-summary__row">
                            <span>Shipping</span>
                            <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                        </div>
                        <div className="cart-summary__row">
                            <span>Tax (GST 18%)</span>
                            <span>{formatPrice(tax)}</span>
                        </div>
                        <div className="cart-summary__row cart-summary__row--total">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

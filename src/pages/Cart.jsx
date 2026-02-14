
import { Link } from 'react-router-dom';
import { Minus, Plus, X, ArrowRight, Tag } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../lib/dummyData';

export default function Cart() {
    const { cart, updateQuantity, removeFromCart } = useStore();

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shipping + tax;

    if (cart.length === 0) {
        return (
            <div className="page">
                <div className="container" style={{ textAlign: 'center', padding: 'var(--space-24) 0' }}>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>Your bag is empty</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
                        Looks like you haven&apos;t added anything to your bag yet.
                    </p>
                    <Link to="/products" className="btn btn--primary">Continue Shopping</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>Shopping Bag ({cart.length})</h1>

                <div className="cart-page">
                    {/* Cart Items */}
                    <div>
                        {cart.map((item) => (
                            <div key={item.cartId} className="cart-item">
                                <Link to={`/products/${item.slug}`} className="cart-item__image">
                                    <img src={item.images[0]} alt={item.name} loading="lazy" />
                                </Link>
                                <div>
                                    <Link to={`/products/${item.slug}`} className="cart-item__name">{item.name}</Link>
                                    <p className="cart-item__variant">Size: {item.selectedSize} | Color: {item.selectedColor?.name}</p>
                                    <div className="qty-stepper" style={{ marginBottom: 'var(--space-2)' }}>
                                        <button
                                            className="qty-stepper__btn"
                                            onClick={() => updateQuantity(item.cartId, -1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="qty-stepper__value">{item.quantity}</span>
                                        <button
                                            className="qty-stepper__btn"
                                            onClick={() => updateQuantity(item.cartId, 1)}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <p className="cart-item__price">{formatPrice(item.price * item.quantity)}</p>
                                    <button
                                        className="cart-item__remove"
                                        onClick={() => removeFromCart(item.cartId)}
                                    >
                                        Remove
                                    </button>
                                </div>
                                <button
                                    style={{ alignSelf: 'start', color: 'var(--color-text-muted)' }}
                                    aria-label="Remove item"
                                    onClick={() => removeFromCart(item.cartId)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="cart-summary">
                        <h3 className="cart-summary__title">Order Summary</h3>
                        <div className="cart-summary__row">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="cart-summary__row">
                            <span>Shipping</span>
                            <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                        </div>
                        <div className="cart-summary__row">
                            <span>Tax (GST 18%)</span>
                            <span>{formatPrice(tax)}</span>
                        </div>
                        <div className="cart-summary__row cart-summary__row--total">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>

                        <div className="cart-summary__coupon">
                            <input type="text" className="cart-summary__coupon-input" placeholder="Coupon code" />
                            <button className="btn btn--secondary btn--sm"><Tag size={14} /> Apply</button>
                        </div>

                        <Link to="/checkout" className="btn btn--primary btn--full btn--lg" style={{ marginTop: 'var(--space-4)' }}>
                            Checkout <ArrowRight size={18} />
                        </Link>

                        <Link to="/products" style={{ display: 'block', textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

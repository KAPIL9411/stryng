import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  Package,
  ChevronRight,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { formatDate } from '../utils/format';
import { getOrderById } from '../api/orders.api';
import useStore from '../store/useStore';

const MERCHANT_PHONE = '919411867984';

export default function OrderTracking() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useStore();
  
  // Get order ID from URL params or query string
  const searchParams = new URLSearchParams(location.search);
  const orderId = id || searchParams.get('id');
  
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);
  const isNewOrder = location.state?.newOrder;

  console.log('📦 OrderTracking - Order ID:', orderId);
  console.log('📦 OrderTracking - User:', user?.id);
  console.log('📦 OrderTracking - Location state:', location.state);

  useEffect(() => {
    if (!order && user && orderId) {
      const fetchOrder = async () => {
        try {
          console.log('📦 Fetching order:', orderId);
          const result = await getOrderById(orderId);
          console.log('📦 Order result:', result);

          if (result.success) {
            setOrder(result.data);
          } else {
            console.error('📦 Order fetch failed:', result.error);
            setError(result.error || 'Order not found or access denied.');
          }
        } catch (err) {
          console.error('📦 Unexpected error:', err);
          setError('Failed to load order details.');
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    } else if (!user) {
      console.log('📦 No user logged in');
      setLoading(false);
      setError('Please log in to view order details.');
    } else if (!orderId) {
      console.log('📦 No order ID provided');
      setLoading(false);
      setError('No order ID provided.');
    }
  }, [orderId, order, user]);

  if (loading) {
    return (
      <div
        className="page container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="page container"
        style={{ textAlign: 'center', padding: '100px 0' }}
      >
        <h2>Order Not Found</h2>
        <p
          style={{
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {error || `We couldn't find the order with ID: ${orderId}`}
        </p>
        <Link to="/account" className="btn btn--primary">
          Go to Orders
        </Link>
      </div>
    );
  }

  // WhatsApp Link Generation
  const waMessage = `Hi, I just placed Order #${order.order_number || order.id}. Here is the payment proof/screenshot.`;
  const waLink = `https://wa.me/${MERCHANT_PHONE}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 'var(--container-lg)' }}>
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb__link">
            Home
          </Link>
          <span className="breadcrumb__separator">
            <ChevronRight size={14} />
          </span>
          <Link to="/account" className="breadcrumb__link">
            Account
          </Link>
          <span className="breadcrumb__separator">
            <ChevronRight size={14} />
          </span>
          <span className="breadcrumb__current">Order {order.order_number || order.id}</span>
        </div>

        {/* Success Banner for New Orders */}
        {isNewOrder && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#064e3b',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  background: '#10b981',
                  borderRadius: '50%',
                  padding: '0.5rem',
                }}
              >
                <CheckCircle color="white" size={32} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Order Placed Successfully!
            </h2>
            <p>
              Thank you for shopping with us. Your order number is{' '}
              <strong>{order.order_number || order.id}</strong>
            </p>
          </div>
        )}

        <h1
          style={{
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Order Tracking
        </h1>
        <p
          style={{
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-8)',
          }}
        >
          Order ID: {order.order_number || order.id}
        </p>

        <div className="order-details-grid">
          {/* Main Content */}
          <div className="order-details-main">
            {/* Action Required: Payment Verification */}
            {order.payment_method === 'upi' &&
              order.payment_status === 'verification_pending' && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #f59e0b',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                  }}
                >
                  <h3
                    style={{
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    ⚠️ Payment Verification Pending
                  </h3>
                  <p style={{ marginBottom: '1rem', color: '#78350f' }}>
                    Since you paid via UPI, please send us the screenshot of
                    your payment to confirm your order.
                  </p>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{
                      backgroundColor: '#25D366',
                      color: 'white',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600',
                    }}
                  >
                    <MessageCircle size={20} /> Send Screenshot on WhatsApp
                  </a>
                </div>
              )}

            <h3 className="section-title">Order Status</h3>
            <div className="order-timeline">
              {order.timeline && order.timeline.length > 0 ? (
                order.timeline.map((step, i) => (
                  <div
                    key={i}
                    className={`order-timeline__item ${step.completed ? 'order-timeline__item--completed' : ''} ${step.current ? 'order-timeline__item--current' : ''}`}
                  >
                    <div className="order-timeline__dot" />
                    <h4 className="order-timeline__title">{step.status}</h4>
                    <p className="order-timeline__time">
                      {step.time ? new Date(step.time).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              ) : (
                <p>
                  Order Placed on{' '}
                  {formatDate(order.created_at)}
                </p>
              )}
            </div>

            {/* Items */}
            <h3
              className="section-title"
              style={{ marginTop: 'var(--space-10)' }}
            >
              Items in this Order
            </h3>
            {order.order_items?.map((item, i) => {
              const imageUrl = item.product_image || item.product?.images?.[0];
              return (
                <div key={i} className="order-item">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.product_name || item.product?.name || 'Product'}
                      className="order-item__image"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="order-item__image-placeholder"
                    style={{ 
                      display: imageUrl ? 'none' : 'flex',
                      width: '80px',
                      height: '100px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: 'var(--radius-sm)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      padding: '0.5rem'
                    }}
                  >
                    No Image
                  </div>
                  <div className="order-item__info">
                    <h4 className="order-item__name">
                      {item.product_name || item.product?.name || 'Product'}
                    </h4>
                    <p className="order-item__meta">
                      Size: {item.size} | Color:{' '}
                      {item.color?.name || item.color} | Qty: {item.quantity}
                    </p>
                    <p className="order-item__price">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side Info */}
          <div className="order-details-sidebar">
            {/* Delivery Address */}
            <div className="info-card">
              <h3 className="info-card__title">
                <MapPin size={16} /> Delivery Address
              </h3>
              <p className="info-card__text">
                {order.shipping_name || order.address?.name || order.address?.full_name}
                <br />
                {order.shipping_address_line1 || order.address?.address_line1}
                <br />
                {(order.shipping_address_line2 || order.address?.address_line2) && (
                  <>
                    {order.shipping_address_line2 || order.address.address_line2}
                    <br />
                  </>
                )}
                {order.shipping_city || order.address?.city}, {order.shipping_state || order.address?.state} —{' '}
                {order.shipping_pincode || order.address?.pincode}
              </p>
              <p className="info-card__has-icon">
                <Phone size={14} /> {order.shipping_phone || order.address?.phone}
              </p>
            </div>

            {/* Order Summary */}
            <div className="cart-summary">
              <h3
                className="cart-summary__title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <Package size={18} /> Order Summary
              </h3>
              <div className="cart-summary__row">
                <span>Subtotal</span>
                <span>{formatPrice(order.total ? order.total / 1.18 : 0)}</span>
              </div>
              <div className="cart-summary__row">
                <span>Shipping</span>
                <span>FREE</span>
              </div>
              {order.coupon_discount > 0 && (
                <div className="cart-summary__row" style={{ color: '#28a745' }}>
                  <span>Coupon Discount ({order.coupon_code})</span>
                  <span>-{formatPrice(order.coupon_discount)}</span>
                </div>
              )}
              <div className="cart-summary__row">
                <span>Tax (GST 18%)</span>
                <span>
                  {formatPrice(
                    order.total ? order.total - order.total / 1.18 : 0
                  )}
                </span>
              </div>
              <div className="cart-summary__row cart-summary__row--total">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px dashed #eee',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Payment Method:</strong>{' '}
                {order.payment_method === 'upi'
                  ? 'UPI / Online'
                  : 'Cash on Delivery'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
                .order-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: var(--space-8);
                    align-items: start;
                }
                .section-title {
                    font-size: var(--text-lg);
                    font-weight: var(--font-semibold);
                    margin-bottom: var(--space-4);
                    font-family: var(--font-primary);
                }
                .order-item {
                    display: flex;
                    gap: var(--space-4);
                    padding: var(--space-4) 0;
                    border-bottom: var(--border-thin);
                }
                .order-item__image {
                    width: 80px;
                    height: 100px;
                    object-fit: cover;
                    border-radius: var(--radius-sm);
                    background: var(--color-gray-100);
                }
                .order-item__name {
                    font-size: var(--text-sm);
                    font-weight: var(--font-medium);
                    margin-bottom: 4px;
                    font-family: var(--font-primary);
                }
                .order-item__meta {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                    margin-bottom: 4px;
                }
                .order-item__price {
                    font-weight: var(--font-semibold);
                    font-size: var(--text-sm);
                    margin-bottom: 0;
                }
                .info-card {
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                    margin-bottom: var(--space-4);
                }
                .info-card__title {
                    font-size: var(--text-sm);
                    font-weight: var(--font-semibold);
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-3);
                    font-family: var(--font-primary);
                }
                .info-card__text {
                    font-size: var(--text-sm);
                    color: var(--color-text-secondary);
                    line-height: var(--leading-relaxed);
                }
                .info-card__has-icon {
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: 0;
                }
                @media (max-width: 768px) {
                    .order-details-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
    </div>
  );
}

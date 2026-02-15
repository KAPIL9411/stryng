import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Package,
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  User,
  XCircle,
  AlertCircle,
  Download,
  Printer,
  RefreshCw,
  Edit,
  MessageSquare,
} from 'lucide-react';
import {
  getOrderById,
  updateOrderStatus,
  verifyPayment,
} from '../../api/orders.api';
import '../../styles/admin-order-details.css';

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString('en-IN')}`;
const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};
const formatTime = (date) => {
  try {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const result = await getOrderById(id);
      console.log('Order data:', result);
      if (result.success) {
        setOrder(result.data);
      } else {
        console.error('Error fetching order:', result.error);
      }
    } catch (error) {
      console.error('Exception fetching order:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    const result = await updateOrderStatus(id, newStatus);
    if (result.success) {
      setOrder({ ...order, status: newStatus });
      alert('Order status updated successfully!');
      fetchOrder(); // Refresh to get updated timeline
    } else {
      alert('Failed to update status: ' + result.error);
    }
    setUpdating(false);
  };

  const handleVerifyPayment = async (isVerified) => {
    const message = isVerified
      ? 'Confirm payment received and mark as PAID?'
      : 'Reject payment and cancel order?';

    if (confirm(message)) {
      setUpdating(true);
      const result = await verifyPayment(id, isVerified);
      if (result.success) {
        alert(
          isVerified
            ? 'Payment verified successfully!'
            : 'Payment rejected and order cancelled'
        );
        fetchOrder();
      } else {
        alert('Failed to verify payment: ' + result.error);
      }
      setUpdating(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const downloadInvoice = () => {
    alert('Invoice download feature - Coming soon!');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} />;
      case 'confirmed':
      case 'processing':
        return <Package size={20} />;
      case 'shipped':
        return <Truck size={20} />;
      case 'delivered':
        return <CheckCircle size={20} />;
      case 'cancelled':
        return <XCircle size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
    };
    return classes[status] || 'status-default';
  };

  if (loading) {
    return (
      <div className="admin-order-details-page">
        <div className="loading-container">
          <RefreshCw size={48} className="spinner" />
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="admin-order-details-page">
        <div className="error-container">
          <AlertCircle size={64} />
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist or has been deleted.</p>
          <Link to="/admin/orders" className="btn-back">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = (order.total || 0) / 1.18;
  const tax = (order.total || 0) - subtotal;
  const orderAddress = order.address || {};
  const orderTimeline = order.timeline || [];

  return (
    <div className="admin-order-details-page">
      {/* Header */}
      <div className="details-header">
        <button onClick={() => navigate('/admin/orders')} className="btn-back-nav">
          <ChevronLeft size={20} />
          Back to Orders
        </button>

        <div className="header-actions">
          <button onClick={fetchOrder} className="btn-action-header">
            <RefreshCw size={18} />
            Refresh
          </button>
          <button onClick={printInvoice} className="btn-action-header">
            <Printer size={18} />
            Print
          </button>
          <button onClick={downloadInvoice} className="btn-action-header">
            <Download size={18} />
            Invoice
          </button>
        </div>
      </div>

      {/* Order Info Card */}
      <div className="order-info-card">
        <div className="order-info-header">
          <div>
            <h1>Order #{(order.id || '').slice(4, 12) || order.id || 'N/A'}</h1>
            <div className="order-meta">
              <span className="meta-item">
                <Calendar size={16} />
                {formatDate(order.created_at)} at {formatTime(order.created_at)}
              </span>
            </div>
          </div>
          <div className="order-badges">
            <span className={`status-badge ${getStatusClass(order.status)}`}>
              {getStatusIcon(order.status)}
              {order.status}
            </span>
            <span
              className={`payment-badge ${
                order.payment_status === 'paid'
                  ? 'payment-paid'
                  : order.payment_status === 'awaiting_verification'
                    ? 'payment-awaiting'
                    : 'payment-pending'
              }`}
            >
              {order.payment_status === 'awaiting_verification'
                ? 'Awaiting Verification'
                : order.payment_status}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        {order.payment_status === 'awaiting_verification' && (
          <div className="quick-actions-alert">
            <AlertCircle size={20} />
            <div className="alert-content">
              <strong>Payment Verification Required</strong>
              <p>
                Customer has marked payment as completed. Please verify the payment
                before proceeding.
              </p>
            </div>
            <div className="alert-actions">
              <button
                onClick={() => handleVerifyPayment(true)}
                className="btn-verify-approve"
                disabled={updating}
              >
                <CheckCircle size={18} />
                Approve Payment
              </button>
              <button
                onClick={() => handleVerifyPayment(false)}
                className="btn-verify-reject"
                disabled={updating}
              >
                <XCircle size={18} />
                Reject Payment
              </button>
            </div>
          </div>
        )}

        {/* Status Update */}
        <div className="status-update-section">
          <label>Update Order Status:</label>
          <select
            className={`status-select-large ${getStatusClass(order.status)}`}
            value={order.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            disabled={updating}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="details-grid">
        {/* Left Column */}
        <div className="details-column">
          {/* Order Items */}
          <div className="details-card">
            <div className="card-header">
              <Package size={20} />
              <h2>Order Items ({order.order_items?.length || 0})</h2>
            </div>
            <div className="items-list">
              {order.order_items?.map((item, i) => {
                const product = item.products || item.product || {};
                const productImage = product.images?.[0] || '/placeholder.png';
                const productName = product.name || 'Unknown Product';
                const itemSize = item.size || 'N/A';
                // Handle color - it might be an object {hex, name} or a string
                const itemColor = typeof item.color === 'object' && item.color !== null
                  ? item.color.name || item.color.hex || 'N/A'
                  : item.color || 'N/A';
                const itemQuantity = item.quantity || 1;
                const itemPrice = item.price || 0;
                
                return (
                  <div key={i} className="item-row">
                    <img
                      src={productImage}
                      alt={productName}
                      className="item-image"
                      onError={(e) => {
                        e.target.src = '/placeholder.png';
                      }}
                    />
                    <div className="item-details">
                      <h4>{productName}</h4>
                      <div className="item-meta">
                        <span>Size: {itemSize}</span>
                        <span>•</span>
                        <span>Color: {itemColor}</span>
                        <span>•</span>
                        <span>Qty: {itemQuantity}</span>
                      </div>
                      <div className="item-price">
                        {formatPrice(itemPrice)} × {itemQuantity}
                      </div>
                    </div>
                    <div className="item-total">{formatPrice(itemPrice * itemQuantity)}</div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (18% GST)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span className="free-badge">FREE</span>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {orderTimeline && orderTimeline.length > 0 && (
            <div className="details-card">
              <div className="card-header">
                <Clock size={20} />
                <h2>Order Timeline</h2>
              </div>
              <div className="timeline">
                {orderTimeline.map((event, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-icon ${getStatusClass(event.status)}`}>
                      {getStatusIcon(event.status)}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-message">{event.message}</div>
                      <div className="timeline-time">
                        {formatDate(event.timestamp)} at {formatTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="details-column">
          {/* Customer Info */}
          <div className="details-card">
            <div className="card-header">
              <User size={20} />
              <h2>Customer Information</h2>
            </div>
            <div className="info-section">
              <div className="info-row">
                <User size={16} />
                <div>
                  <div className="info-label">Full Name</div>
                  <div className="info-value">{orderAddress.full_name || orderAddress.name || 'N/A'}</div>
                </div>
              </div>
              <div className="info-row">
                <Phone size={16} />
                <div>
                  <div className="info-label">Phone Number</div>
                  <div className="info-value">{orderAddress.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="details-card">
            <div className="card-header">
              <MapPin size={20} />
              <h2>Shipping Address</h2>
            </div>
            <div className="address-content">
              <p className="address-name">{orderAddress.full_name || orderAddress.name || 'N/A'}</p>
              <p>{orderAddress.address_line1 || orderAddress.street || 'N/A'}</p>
              {orderAddress.address_line2 && <p>{orderAddress.address_line2}</p>}
              {orderAddress.landmark && (
                <p className="address-landmark">Near {orderAddress.landmark}</p>
              )}
              <p>
                {orderAddress.city || 'N/A'}, {orderAddress.state || 'N/A'}
              </p>
              <p className="address-pincode">PIN: {orderAddress.pincode || orderAddress.pin || 'N/A'}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="details-card">
            <div className="card-header">
              <CreditCard size={20} />
              <h2>Payment Information</h2>
            </div>
            <div className="payment-info-grid">
              <div className="payment-info-item">
                <div className="info-label">Payment Method</div>
                <div className="info-value payment-method-badge">
                  {order.payment_method === 'upi' ? 'UPI / QR Code' : 'Cash on Delivery'}
                </div>
              </div>
              <div className="payment-info-item">
                <div className="info-label">Payment Status</div>
                <div
                  className={`info-value ${
                    order.payment_status === 'paid'
                      ? 'text-success'
                      : order.payment_status === 'awaiting_verification'
                        ? 'text-warning'
                        : 'text-pending'
                  }`}
                >
                  {order.payment_status === 'awaiting_verification'
                    ? 'Awaiting Verification'
                    : order.payment_status}
                </div>
              </div>
              {order.transaction_id && (
                <div className="payment-info-item full-width">
                  <div className="info-label">Transaction ID</div>
                  <div className="info-value transaction-id">{order.transaction_id}</div>
                </div>
              )}
              <div className="payment-info-item full-width">
                <div className="info-label">Amount</div>
                <div className="info-value amount-value">{formatPrice(order.total)}</div>
              </div>
            </div>

            {order.payment_method === 'upi' &&
              order.payment_status === 'awaiting_verification' && (
                <div className="payment-note">
                  <AlertCircle size={16} />
                  <p>
                    Verify payment receipt in your bank account before approving. Amount:{' '}
                    <strong>{formatPrice(order.total)}</strong>
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

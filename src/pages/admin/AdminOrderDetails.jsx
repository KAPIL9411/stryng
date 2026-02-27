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
import { formatPrice as utilFormatPrice, formatDate as utilFormatDate, formatDateTime } from '../../utils/format';
import '../../styles/admin-order-details.css';

const formatPrice = (price) => utilFormatPrice(price || 0);

const formatDate = (date) => {
  try {
    return utilFormatDate(date);
  } catch {
    return 'N/A';
  }
};

const formatTime = (date) => {
  try {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && date.toDate) {
      return date.toDate().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    if (date && typeof date === 'object' && date.seconds) {
      const d = new Date(date.seconds * 1000);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

// Format status strings (convert snake_case to Title Case)
const formatStatus = (status) => {
  if (!status) return 'N/A';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  
  // Build address object from shipping fields
  const orderAddress = {
    full_name: order.shipping_name || order.address?.full_name || order.address?.name,
    name: order.shipping_name || order.address?.name,
    phone: order.shipping_phone || order.address?.phone,
    address_line1: order.shipping_address_line1 || order.address?.address_line1,
    address_line2: order.shipping_address_line2 || order.address?.address_line2,
    city: order.shipping_city || order.address?.city,
    state: order.shipping_state || order.address?.state,
    pincode: order.shipping_pincode || order.address?.pincode,
    landmark: order.shipping_landmark || order.address?.landmark,
  };
  
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
            <h1>Order #{order.order_number || order.id || 'N/A'}</h1>
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
              {formatStatus(order.status)}
            </span>
            <span
              className={`payment-badge ${
                order.payment_status === 'paid'
                  ? 'payment-paid'
                  : order.payment_status === 'verification_pending'
                    ? 'payment-awaiting'
                    : 'payment-pending'
              }`}
            >
              {formatStatus(order.payment_status)}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        {order.payment_status === 'verification_pending' && (
          <div className="quick-actions-alert">
            <AlertCircle size={20} />
            <div className="alert-content">
              <strong>Payment Verification Required</strong>
              <p>
                Customer has submitted payment details. Please verify the payment
                before confirming the order.
              </p>
              {order.upi_transaction_id && (
                <div className="payment-details-box">
                  <strong>UPI Transaction ID:</strong>
                  <code className="transaction-id-display">{order.upi_transaction_id}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(order.upi_transaction_id)}
                    className="btn-copy-small"
                    title="Copy Transaction ID"
                  >
                    Copy
                  </button>
                </div>
              )}
              <div className="verification-instructions">
                <p><strong>Verification Steps:</strong></p>
                <ol>
                  <li>Check your UPI app/bank account for incoming payment</li>
                  <li>Verify amount: <strong>{formatPrice(order.total)}</strong></li>
                  <li>Match transaction ID if provided</li>
                  <li>Confirm payment received before approving</li>
                </ol>
              </div>
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
                // Get product data - check multiple possible locations
                const product = item.products || item.product || {};
                
                // Get image - check multiple possible locations
                const productImage = 
                  item.product_image || // Direct field from order_items
                  product.images?.[0] || // From nested product object
                  item.images?.[0] || // From item itself
                  '/placeholder.png';
                
                // Get product name
                const productName = 
                  item.product_name || // Direct field from order_items
                  product.name || // From nested product object
                  item.name || // From item itself
                  'Unknown Product';
                
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
                  {order.payment_method === 'upi' ? 'UPI / QR Code' : order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method?.toUpperCase() || 'N/A'}
                </div>
              </div>
              <div className="payment-info-item">
                <div className="info-label">Payment Status</div>
                <div
                  className={`info-value ${
                    order.payment_status === 'paid'
                      ? 'text-success'
                      : order.payment_status === 'verification_pending'
                        ? 'text-warning'
                        : 'text-pending'
                  }`}
                >
                  {formatStatus(order.payment_status)}
                </div>
              </div>
              {order.upi_transaction_id && (
                <div className="payment-info-item full-width">
                  <div className="info-label">UPI Transaction ID</div>
                  <div className="info-value transaction-id-box">
                    <code>{order.upi_transaction_id}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.upi_transaction_id);
                        alert('Transaction ID copied to clipboard!');
                      }}
                      className="btn-copy-inline"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <div className="payment-info-item full-width">
                <div className="info-label">Amount to Verify</div>
                <div className="info-value amount-value">{formatPrice(order.total)}</div>
              </div>
              {order.payment_verified_at && (
                <div className="payment-info-item full-width">
                  <div className="info-label">Verified At</div>
                  <div className="info-value">
                    {formatDate(order.payment_verified_at)} at {formatTime(order.payment_verified_at)}
                  </div>
                </div>
              )}
            </div>

            {order.payment_method === 'upi' &&
              order.payment_status === 'verification_pending' && (
                <div className="payment-note">
                  <AlertCircle size={16} />
                  <div>
                    <p><strong>Verification Checklist:</strong></p>
                    <ul className="verification-checklist">
                      <li>✓ Check UPI app for incoming payment</li>
                      <li>✓ Verify amount matches: <strong>{formatPrice(order.total)}</strong></li>
                      <li>✓ Confirm transaction ID (if provided)</li>
                      <li>✓ Ensure payment is not pending/failed</li>
                    </ul>
                    <p className="warning-text">
                      ⚠️ Only approve after confirming payment in your bank account
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

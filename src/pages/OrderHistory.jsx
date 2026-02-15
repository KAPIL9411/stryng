import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Calendar, Loader } from 'lucide-react';
import { getUserOrders } from '../api/orders.api';
import { formatPrice } from '../utils/format';
import SEO from '../components/SEO';

const getStatusBadge = (status) => {
  const styles = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    placed: { bg: '#dbeafe', color: '#1e40af', label: 'Placed' },
    processing: { bg: '#e0e7ff', color: '#3730a3', label: 'Processing' },
    shipped: { bg: '#ddd6fe', color: '#5b21b6', label: 'Shipped' },
    delivered: { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  };
  const style = styles[status] || styles.pending;
  return (
    <span
      style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
};

const getPaymentStatusBadge = (status) => {
  const styles = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    verification_pending: {
      bg: '#fed7aa',
      color: '#9a3412',
      label: 'Verifying',
    },
    paid: { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
  };
  const style = styles[status] || styles.pending;
  return (
    <span
      style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
};

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    const result = await getUserOrders(page, pagination.pageSize);

    if (result.success) {
      setOrders(result.data);
      setPagination(result.pagination);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <SEO title="My Orders - Stryng Clothing" />
        <div
          className="container"
          style={{ padding: '4rem 0', textAlign: 'center' }}
        >
          <Loader size={32} className="spinner" style={{ margin: '0 auto' }} />
          <p
            style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}
          >
            Loading your orders...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <SEO title="My Orders - Stryng Clothing" />
        <div
          className="container"
          style={{ padding: '4rem 0', textAlign: 'center' }}
        >
          <h2>Error Loading Orders</h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: '2rem',
            }}
          >
            {error}
          </p>
          <button onClick={fetchOrders} className="btn btn--primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="My Orders - Stryng Clothing" />

      <div className="page">
        <div className="container" style={{ padding: '3rem 0' }}>
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
            <span className="breadcrumb__current">My Orders</span>
          </div>

          <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>My Orders</h1>

          {orders.length === 0 ? (
            <div
              className="empty-state"
              style={{ padding: '4rem 2rem', textAlign: 'center' }}
            >
              <Package
                size={64}
                style={{ opacity: 0.3, marginBottom: '1rem' }}
              />
              <h2>No Orders Yet</h2>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  marginBottom: '2rem',
                }}
              >
                You haven't placed any orders yet. Start shopping to see your
                orders here.
              </p>
              <Link to="/products" className="btn btn--primary">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-card__header">
                    <div className="order-card__info">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
                          Order #{order.id.slice(0, 8)}
                        </h3>
                        {getStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.payment_status)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <Calendar size={14} />
                        <span>
                          {new Date(order.created_at).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="order-card__total">
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Total Amount
                      </div>
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'var(--font-bold)',
                        }}
                      >
                        {formatPrice(order.total)}
                      </div>
                    </div>
                  </div>

                  <div className="order-card__items">
                    {order.order_items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="order-item-preview">
                        <img
                          src={item.product?.images?.[0]}
                          alt={item.product?.name}
                          className="order-item-preview__image"
                        />
                        <div className="order-item-preview__details">
                          <h4>{item.product?.name}</h4>
                          <p>
                            Size: {item.size} | Color:{' '}
                            {item.color?.name || item.color}
                          </p>
                          <p>
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.order_items?.length > 3 && (
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)',
                          marginTop: '0.5rem',
                        }}
                      >
                        +{order.order_items.length - 3} more item(s)
                      </p>
                    )}
                  </div>

                  <div className="order-card__footer">
                    <div className="order-card__address">
                      <strong>Delivery Address:</strong>
                      <span>
                        {order.address?.name}, {order.address?.city},{' '}
                        {order.address?.state} - {order.address?.pincode}
                      </span>
                    </div>
                    <Link
                      to={`/order/${order.id}`}
                      className="btn btn--secondary"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => fetchOrders(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="btn btn--secondary"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {pagination.currentPage} of {pagination.totalPages} (
                    {pagination.totalItems} orders)
                  </span>
                  <button
                    onClick={() => fetchOrders(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="btn btn--secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
                .orders-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .order-card {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    padding: 1.5rem;
                    transition: box-shadow 0.3s ease;
                }

                .order-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .order-card__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                    margin-bottom: 1.5rem;
                }

                .order-card__items {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                    margin-bottom: 1.5rem;
                }

                .order-item-preview {
                    display: flex;
                    gap: 1rem;
                }

                .order-item-preview__image {
                    width: 60px;
                    height: 80px;
                    object-fit: cover;
                    background: var(--color-bg-secondary);
                }

                .order-item-preview__details h4 {
                    margin: 0 0 0.25rem 0;
                    font-size: 0.9375rem;
                    font-weight: var(--font-semibold);
                }

                .order-item-preview__details p {
                    margin: 0.125rem 0;
                    font-size: 0.8125rem;
                    color: var(--color-text-secondary);
                }

                .order-card__footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                }

                .order-card__address {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    font-size: 0.875rem;
                }

                .order-card__address strong {
                    color: var(--color-text-primary);
                }

                .order-card__address span {
                    color: var(--color-text-secondary);
                }

                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 2rem;
                    padding: 1rem;
                }

                .pagination-info {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                }

                .pagination .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .order-card__header {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .order-card__total {
                        width: 100%;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .order-card__footer {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .order-card__footer .btn {
                        width: 100%;
                    }

                    .pagination {
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                }
            `}</style>
    </>
  );
}

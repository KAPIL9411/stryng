import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw,
} from 'lucide-react';
import {
  getAllOrders,
  updateOrderStatus,
  verifyPayment,
} from '../../api/orders.api';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    const filters = statusFilter !== 'all' ? { status: statusFilter } : {};
    const result = await getAllOrders(filters, page, pagination.pageSize);

    if (result.success) {
      setOrders(result.data || []);
      setPagination(result.pagination);
    } else {
      console.error('Error fetching orders:', result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Handle Status Update
  const handleUpdateStatus = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);

    if (result.success) {
      // Optimistic update
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } else {
      alert('Failed to update status: ' + result.error);
    }
  };

  // Handle Payment Verification
  const handleVerifyPayment = async (orderId) => {
    if (confirm('Mark this payment as RECEIVED?')) {
      const result = await verifyPayment(orderId, true);

      if (result.success) {
        fetchOrders(); // Refresh to get updated data
      } else {
        alert('Failed to verify payment: ' + result.error);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="badge badge--warning">
            <Clock size={12} /> Pending
          </span>
        );
      case 'processing':
        return (
          <span className="badge badge--info">
            <RefreshCw size={12} /> Processing
          </span>
        );
      case 'shipped':
        return (
          <span className="badge badge--primary">
            <Truck size={12} /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="badge badge--success">
            <CheckCircle size={12} /> Delivered
          </span>
        );
      case 'cancelled':
        return <span className="badge badge--danger">Cancelled</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.profiles?.email &&
        order.profiles.email
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (order.profiles?.full_name &&
        order.profiles.full_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Orders</h1>
          <button onClick={fetchOrders} className="btn btn--secondary btn--sm">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by ID, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <Filter size={18} className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              Loading orders...
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ textAlign: 'center', padding: '40px' }}
                    >
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td>
                        <div className="customer-info">
                          <span className="font-semibold">
                            {order.profiles?.full_name || 'Guest'}
                          </span>
                          <span className="text-sm text-muted">
                            {order.profiles?.email}
                          </span>
                        </div>
                      </td>
                      <td>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="font-semibold">
                        {formatPrice(order.total)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{ fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            {order.payment_method === 'upi' ? 'UPI' : 'COD'}
                          </span>
                          <span
                            className={`badge ${
                              order.payment_status === 'paid'
                                ? 'badge--success'
                                : order.payment_status ===
                                    'verification_pending'
                                  ? 'badge--warning'
                                  : 'badge--info'
                            }`}
                          >
                            {order.payment_status === 'verification_pending'
                              ? 'Verify'
                              : order.payment_status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="status-select-wrapper">
                          {getStatusBadge(order.status)}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleUpdateStatus(order.id, e.target.value)
                            }
                            className="status-dropdown"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          {/* View Details */}
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="btn btn--secondary btn--xs"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Link>

                          {/* Quick Action: Mark Paid for UPI */}
                          {order.payment_method === 'upi' &&
                            order.payment_status === 'verification_pending' && (
                              <button
                                className="btn btn--primary btn--xs"
                                onClick={() => handleVerifyPayment(order.id)}
                                title="Confirm Payment Received"
                              >
                                <CheckCircle size={14} /> Mark Paid
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {(pagination.hasNext || pagination.hasPrev) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '2rem',
              padding: '1rem',
            }}
          >
            <button
              onClick={() => fetchOrders(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev || loading}
              className="btn btn--secondary btn--sm"
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              Page {pagination.currentPage}
            </span>
            <button
              onClick={() => fetchOrders(pagination.currentPage + 1)}
              disabled={!pagination.hasNext || loading}
              className="btn btn--secondary btn--sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

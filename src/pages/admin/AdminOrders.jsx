import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw,
  Package,
  XCircle,
  AlertCircle,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getAllOrders,
  updateOrderStatus,
  verifyPayment,
} from '../../api/orders.api';
import '../../styles/admin-orders.css';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;
const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
});

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    revenue: 0,
    awaitingPayment: 0,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    const filters = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (paymentFilter !== 'all') filters.payment_status = paymentFilter;

    const result = await getAllOrders(filters, page, pagination.pageSize);

    if (result.success) {
      setOrders(result.data || []);
      setPagination(result.pagination);
      calculateStats(result.data || []);
    }
    setLoading(false);
  };

  const calculateStats = (ordersData) => {
    const stats = {
      total: ordersData.length,
      pending: ordersData.filter((o) => o.status === 'pending').length,
      processing: ordersData.filter((o) => o.status === 'processing').length,
      shipped: ordersData.filter((o) => o.status === 'shipped').length,
      delivered: ordersData.filter((o) => o.status === 'delivered').length,
      cancelled: ordersData.filter((o) => o.status === 'cancelled').length,
      revenue: ordersData
        .filter((o) => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.total || 0), 0),
      awaitingPayment: ordersData.filter(
        (o) => o.payment_status === 'awaiting_verification'
      ).length,
    };
    setStats(stats);
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      fetchOrders(pagination.currentPage);
    } else {
      alert('Failed to update status: ' + result.error);
    }
  };

  const handleVerifyPayment = async (orderId, isVerified) => {
    const message = isVerified
      ? 'Confirm payment received and mark as PAID?'
      : 'Reject payment and cancel order?';

    if (confirm(message)) {
      const result = await verifyPayment(orderId, isVerified);
      if (result.success) {
        fetchOrders(pagination.currentPage);
      } else {
        alert('Failed to verify payment: ' + result.error);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} />;
      case 'confirmed':
      case 'processing':
        return <Package size={14} />;
      case 'shipped':
        return <Truck size={14} />;
      case 'delivered':
        return <CheckCircle size={14} />;
      case 'cancelled':
        return <XCircle size={14} />;
      default:
        return <AlertCircle size={14} />;
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

  const getPaymentStatusClass = (status) => {
    const classes = {
      pending: 'payment-pending',
      awaiting_verification: 'payment-awaiting',
      paid: 'payment-paid',
      failed: 'payment-failed',
    };
    return classes[status] || 'payment-default';
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.address?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.address?.phone?.includes(searchTerm);

    const matchesDate = () => {
      if (dateFilter === 'all') return true;
      const orderDate = new Date(order.created_at);
      const today = new Date();
      const daysDiff = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case 'today':
          return daysDiff === 0;
        case 'week':
          return daysDiff <= 7;
        case 'month':
          return daysDiff <= 30;
        default:
          return true;
      }
    };

    return matchesSearch && matchesDate();
  });

  const exportOrders = () => {
    const csv = [
      ['Order ID', 'Date', 'Customer', 'Phone', 'Total', 'Payment Method', 'Payment Status', 'Order Status'].join(','),
      ...filteredOrders.map(order => [
        order.id,
        formatDate(order.created_at),
        order.address?.full_name || 'N/A',
        order.address?.phone || 'N/A',
        order.total,
        order.payment_method,
        order.payment_status,
        order.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="admin-orders-page">
      {/* Header */}
      <div className="orders-header">
        <div className="header-content">
          <div className="header-icon">
            <ShoppingBag size={32} />
          </div>
          <div>
            <h1>Orders Management</h1>
            <p>Manage and track all customer orders</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={exportOrders} className="btn-export">
            <Download size={18} />
            Export CSV
          </button>
          <button onClick={() => fetchOrders(pagination.currentPage)} className="btn-refresh">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{pagination.totalItems || stats.total}</div>
          </div>
        </div>

        <div className="stat-card stat-revenue">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{formatPrice(stats.revenue)}</div>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Orders</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
        </div>

        <div className="stat-card stat-awaiting">
          <div className="stat-icon">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Awaiting Payment</div>
            <div className="stat-value">{stats.awaitingPayment}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by Order ID, Customer Name, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="filter-item">
            <Filter size={16} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-item">
            <DollarSign size={16} />
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="awaiting_verification">Awaiting Verification</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-item">
            <Calendar size={16} />
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinner" />
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={64} />
            <h3>No orders found</h3>
            <p>Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Order ID">
                    <div className="order-id">
                      <span className="id-text">#{order.id.slice(4, 12)}</span>
                    </div>
                  </td>
                  <td data-label="Date & Time">
                    <div className="date-time">
                      <span className="date">{formatDate(order.created_at)}</span>
                      <span className="time">{formatTime(order.created_at)}</span>
                    </div>
                  </td>
                  <td data-label="Customer">
                    <div className="customer-info">
                      <span className="customer-name">
                        {order.address?.full_name || 'Guest'}
                      </span>
                      <span className="customer-phone">{order.address?.phone}</span>
                    </div>
                  </td>
                  <td data-label="Items">
                    <div className="items-count">
                      <Package size={14} />
                      {order.order_items?.length || 0} items
                    </div>
                  </td>
                  <td data-label="Total">
                    <div className="order-total">{formatPrice(order.total)}</div>
                  </td>
                  <td data-label="Payment">
                    <div className="payment-info">
                      <span className="payment-method">
                        {order.payment_method === 'upi' ? 'UPI' : 'COD'}
                      </span>
                      <span className={`payment-status ${getPaymentStatusClass(order.payment_status)}`}>
                        {order.payment_status === 'awaiting_verification'
                          ? 'Awaiting'
                          : order.payment_status}
                      </span>
                    </div>
                  </td>
                  <td data-label="Status">
                    <select
                      className={`status-select ${getStatusClass(order.status)}`}
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <Link to={`/admin/orders/${order.id}`} className="btn-action btn-view">
                        <Eye size={16} />
                        View
                      </Link>
                      {order.payment_status === 'awaiting_verification' && (
                        <>
                          <button
                            onClick={() => handleVerifyPayment(order.id, true)}
                            className="btn-action btn-approve"
                            title="Approve Payment"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleVerifyPayment(order.id, false)}
                            className="btn-action btn-reject"
                            title="Reject Payment"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => fetchOrders(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || loading}
            className="pagination-btn"
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <div className="pagination-info">
            Page {pagination.currentPage} of {pagination.totalPages}
            <span className="pagination-total">
              ({pagination.totalItems} total orders)
            </span>
          </div>
          <button
            onClick={() => fetchOrders(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages || loading}
            className="pagination-btn"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

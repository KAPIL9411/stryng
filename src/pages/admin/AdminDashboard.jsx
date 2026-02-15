import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDashboardStats, getRecentOrders } from '../../api/orders.api';
import { useAllProducts } from '../../hooks/useProducts';
import '../../styles/admin-dashboard.css';

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString('en-IN')}`;
const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'N/A';
  }
};

export default function AdminDashboard() {
  const { data: products = [], isLoading: isLoadingProducts } = useAllProducts();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    loading: true,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsResult = await getDashboardStats();
      if (statsResult.success) {
        setStats({
          totalOrders: statsResult.data.totalOrders,
          totalRevenue: statsResult.data.totalRevenue,
          pendingOrders: statsResult.data.pendingOrders,
          loading: false,
        });
      }

      // Fetch recent orders
      const ordersResult = await getRecentOrders(5);
      if (ordersResult.success) {
        setRecentOrders(ordersResult.data || []);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Find low stock products (stock < 10)
    if (products.length > 0) {
      const lowStock = products
        .filter((p) => p.stock < 10 && p.stock > 0)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);
      setLowStockProducts(lowStock);
    }
  }, [products]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const statCards = [
    {
      label: 'Total Revenue',
      value: stats.loading ? '...' : formatPrice(stats.totalRevenue),
      icon: <DollarSign size={24} />,
      color: '#10B981',
      bgColor: '#D1FAE5',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      label: 'Total Orders',
      value: stats.loading ? '...' : stats.totalOrders,
      icon: <ShoppingCart size={24} />,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      trend: '+8.2%',
      trendUp: true,
    },
    {
      label: 'Total Products',
      value: isLoadingProducts ? '...' : products.length,
      icon: <Package size={24} />,
      color: '#4F46E5',
      bgColor: '#E0E7FF',
      trend: `${lowStockProducts.length} low stock`,
      trendUp: false,
      isWarning: lowStockProducts.length > 0,
    },
    {
      label: 'Pending Orders',
      value: stats.loading ? '...' : stats.pendingOrders,
      icon: <Clock size={24} />,
      color: '#EF4444',
      bgColor: '#FEE2E2',
      trend: 'Needs attention',
      trendUp: false,
      isWarning: stats.pendingOrders > 0,
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="status-icon-pending" />;
      case 'confirmed':
      case 'processing':
        return <Package size={14} className="status-icon-processing" />;
      case 'shipped':
        return <Truck size={14} className="status-icon-shipped" />;
      case 'delivered':
        return <CheckCircle size={14} className="status-icon-delivered" />;
      case 'cancelled':
        return <AlertCircle size={14} className="status-icon-cancelled" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-badge-pending',
      confirmed: 'status-badge-confirmed',
      processing: 'status-badge-processing',
      shipped: 'status-badge-shipped',
      delivered: 'status-badge-delivered',
      cancelled: 'status-badge-cancelled',
    };
    return classes[status] || 'status-badge-default';
  };

  return (
    <div className="admin-dashboard-enhanced">
      {/* Header with Refresh */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here's what's happening with your store today.</p>
        </div>
        <button
          onClick={handleRefresh}
          className={`btn-refresh-dashboard ${refreshing ? 'refreshing' : ''}`}
          disabled={refreshing}
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-enhanced">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card-enhanced">
            <div className="stat-card-header">
              <div
                className="stat-icon-enhanced"
                style={{ backgroundColor: stat.bgColor, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="stat-trend">
                {stat.isWarning ? (
                  <AlertTriangle size={16} className="trend-warning" />
                ) : stat.trendUp ? (
                  <ArrowUp size={16} className="trend-up" />
                ) : (
                  <ArrowDown size={16} className="trend-down" />
                )}
                <span className={stat.isWarning ? 'trend-warning-text' : ''}>
                  {stat.trend}
                </span>
              </div>
            </div>
            <div className="stat-content-enhanced">
              <p className="stat-label-enhanced">{stat.label}</p>
              <h2 className="stat-value-enhanced">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="action-cards-grid">
          <Link to="/admin/products/new" className="action-card-enhanced">
            <div className="action-icon">
              <Package size={28} />
            </div>
            <div className="action-content">
              <h3>Add Product</h3>
              <p>Create new product listing</p>
            </div>
          </Link>
          <Link to="/admin/orders" className="action-card-enhanced">
            <div className="action-icon">
              <ShoppingCart size={28} />
            </div>
            <div className="action-content">
              <h3>Manage Orders</h3>
              <p>View and process orders</p>
            </div>
          </Link>
          <Link to="/admin/products" className="action-card-enhanced">
            <div className="action-icon">
              <TrendingUp size={28} />
            </div>
            <div className="action-content">
              <h3>View Products</h3>
              <p>Manage inventory</p>
            </div>
          </Link>
          <Link to="/admin/banners" className="action-card-enhanced">
            <div className="action-icon">
              <Users size={28} />
            </div>
            <div className="action-content">
              <h3>Manage Banners</h3>
              <p>Update homepage banners</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Recent Orders */}
        <div className="dashboard-card">
          <div className="card-header-enhanced">
            <div>
              <h2>Recent Orders</h2>
              <p>Latest customer orders</p>
            </div>
            <Link to="/admin/orders" className="btn-view-all">
              View All
            </Link>
          </div>
          <div className="orders-list-enhanced">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="order-item-enhanced"
                >
                  <div className="order-item-left">
                    <div className="order-id-badge">
                      #{order.id.slice(4, 12)}
                    </div>
                    <div className="order-customer">
                      <span className="customer-name">
                        {order.address?.full_name || 'Guest'}
                      </span>
                      <span className="order-date">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="order-item-right">
                    <span className="order-amount">
                      {formatPrice(order.total)}
                    </span>
                    <span className={`status-badge-small ${getStatusClass(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-state-small">
                <ShoppingCart size={48} />
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="dashboard-card">
          <div className="card-header-enhanced">
            <div>
              <h2>Low Stock Alerts</h2>
              <p>Products running low</p>
            </div>
            <Link to="/admin/products" className="btn-view-all">
              View All
            </Link>
          </div>
          <div className="low-stock-list">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <div key={product.id} className="low-stock-item">
                  <img
                    src={product.images?.[0] || '/placeholder.jpg'}
                    alt={product.name}
                    className="product-thumb"
                  />
                  <div className="product-info-enhanced">
                    <h4>{product.name}</h4>
                    <p className="product-category">{product.category}</p>
                  </div>
                  <div className="stock-info">
                    <span className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : 'low-stock'}`}>
                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                    </span>
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="btn-icon-small"
                    >
                      <Eye size={16} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-small">
                <Package size={48} />
                <p>All products well stocked!</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="dashboard-card">
          <div className="card-header-enhanced">
            <div>
              <h2>Top Products</h2>
              <p>Best selling items</p>
            </div>
            <Link to="/admin/products" className="btn-view-all">
              View All
            </Link>
          </div>
          <div className="top-products-list">
            {products.slice(0, 5).map((product, index) => (
              <div key={product.id} className="top-product-item">
                <div className="product-rank">#{index + 1}</div>
                <img
                  src={product.images?.[0] || '/placeholder.jpg'}
                  alt={product.name}
                  className="product-thumb"
                />
                <div className="product-info-enhanced">
                  <h4>{product.name}</h4>
                  <p className="product-price">{formatPrice(product.price)}</p>
                </div>
                <Link
                  to={`/admin/products/${product.id}/edit`}
                  className="btn-icon-small"
                >
                  <Eye size={16} />
                </Link>
              </div>
            ))}
            {products.length === 0 && !isLoadingProducts && (
              <div className="empty-state-small">
                <Package size={48} />
                <p>No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-card">
          <div className="card-header-enhanced">
            <div>
              <h2>Quick Stats</h2>
              <p>At a glance metrics</p>
            </div>
          </div>
          <div className="quick-stats-list">
            <div className="quick-stat-item">
              <div className="quick-stat-icon" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
                <Package size={20} />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-label">Active Products</span>
                <span className="quick-stat-value">{products.length}</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                <AlertTriangle size={20} />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-label">Low Stock Items</span>
                <span className="quick-stat-value">{lowStockProducts.length}</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-icon" style={{ background: '#FEE2E2', color: '#EF4444' }}>
                <Clock size={20} />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-label">Pending Orders</span>
                <span className="quick-stat-value">{stats.pendingOrders}</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-icon" style={{ background: '#D1FAE5', color: '#10B981' }}>
                <CheckCircle size={20} />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-label">Total Revenue</span>
                <span className="quick-stat-value">{formatPrice(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

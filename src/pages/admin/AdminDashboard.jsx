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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDashboardStats, getRecentOrders } from '../../api/orders.api';
import { useAllProducts } from '../../hooks/useProducts';
import { formatPrice } from '../../utils/format';

export default function AdminDashboard() {
  const { data: products = [], isLoading: isLoadingProducts } =
    useAllProducts();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    loading: true,
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch stats with caching
        const statsResult = await getDashboardStats();
        
        if (statsResult.success) {
          setStats({
            totalOrders: statsResult.data.totalOrders,
            totalCustomers: statsResult.data.totalCustomers,
            totalRevenue: statsResult.data.totalRevenue,
            pendingOrders: statsResult.data.pendingOrders,
            loading: false,
          });
        }

        // Fetch recent orders with full profile data
        const ordersResult = await getRecentOrders(5);
        if (ordersResult.success) {
          setRecentOrders(ordersResult.data || []);
        }
      } catch (err) {
        console.error('Stats fetch error:', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Revenue',
      value: stats.loading ? '...' : formatPrice(stats.totalRevenue),
      icon: <DollarSign size={24} />,
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      label: 'Total Orders',
      value: stats.loading ? '...' : stats.totalOrders,
      icon: <ShoppingCart size={24} />,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      label: 'Total Products',
      value: isLoadingProducts ? '...' : products.length,
      icon: <Package size={24} />,
      color: '#4F46E5',
      bgColor: '#E0E7FF',
    },
    {
      label: 'Customers',
      value: stats.loading ? '...' : stats.totalCustomers,
      icon: <Users size={24} />,
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="text-warning" />;
      case 'processing':
        return <AlertCircle size={14} className="text-info" />;
      case 'shipped':
        return <Truck size={14} className="text-primary" />;
      case 'delivered':
        return <CheckCircle size={14} className="text-success" />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: stat.bgColor, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <h2 className="stat-value">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-cards">
          <Link to="/admin/products/new" className="action-card">
            <Package size={32} />
            <h3>Add New Product</h3>
            <p>Create a new product listing</p>
          </Link>
          <Link to="/admin/products" className="action-card">
            <ShoppingCart size={32} />
            <h3>Manage Products</h3>
            <p>View and edit existing products</p>
          </Link>
          <Link to="/admin/orders" className="action-card">
            <Users size={32} />
            <h3>Manage Orders</h3>
            <p>View and update customer orders</p>
          </Link>
        </div>
      </div>

      <div className="grid grid--2">
        {/* Recent Orders */}
        <div className="recent-section">
          <div className="flex flex--between items-center mb-4">
            <h2>Recent Orders</h2>
            <Link to="/admin/orders" className="btn btn--ghost btn--sm">
              View All
            </Link>
          </div>
          <div className="order-list">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="order-item"
                >
                  <div className="order-item__info">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="font-semibold">
                        #{order.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {order.profiles?.full_name || 'Guest'}
                    </p>
                  </div>
                  <div className="order-item__details">
                    <p className="font-semibold">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-muted text-center p-8">No orders yet</p>
            )}
          </div>
        </div>

        {/* Recent Products */}
        <div className="recent-section">
          <div className="flex flex--between items-center mb-4">
            <h2>Recent Products</h2>
            <Link to="/admin/products" className="btn btn--ghost btn--sm">
              View All
            </Link>
          </div>
          <div className="product-list">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="product-item">
                <img
                  src={product.images?.[0] || '/placeholder.jpg'}
                  alt={product.name}
                />
                <div className="product-details">
                  <h4>{product.name}</h4>
                  <p className="text-sm text-muted">{product.category}</p>
                  <p className="font-semibold">{formatPrice(product.price)}</p>
                </div>
                <Link
                  to={`/admin/products/${product.id}/edit`}
                  className="btn btn--sm btn--secondary"
                >
                  Edit
                </Link>
              </div>
            ))}
            {products.length === 0 && !isLoadingProducts && (
              <p className="text-muted text-center p-8">No products found.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
                .order-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }
                
                .order-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-4);
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    text-decoration: none;
                    color: inherit;
                    transition: all 0.2s ease;
                }
                
                .order-item:hover {
                    border-color: var(--color-primary);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .order-item__info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }
                
                .order-item__details {
                    text-align: right;
                }
                
                .text-warning { color: #F59E0B; }
                .text-info { color: #3B82F6; }
                .text-primary { color: var(--color-primary); }
                .text-success { color: #10B981; }
            `}</style>
    </div>
  );
}

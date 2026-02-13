import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Users, TrendingUp, Loader2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
    const { products, fetchProducts } = useStore();
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        loading: true
    });

    useEffect(() => {
        fetchProducts(); // Ensure products are up to date

        async function fetchStats() {
            try {
                // Get orders for revenue and count
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('total, payment_status');

                // Get total customers (profiles)
                const { count: userCount, error: userError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                if (orderError) console.error('Error fetching orders:', orderError);
                if (userError) console.error('Error fetching users:', userError);

                const totalOrders = orderData ? orderData.length : 0;
                const totalRevenue = orderData
                    ? orderData
                        .filter(o => o.payment_status === 'paid')
                        .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
                    : 0;

                setStats({
                    totalOrders,
                    totalCustomers: userCount || 0,
                    totalRevenue,
                    loading: false
                });
            } catch (err) {
                console.error('Stats fetch error:', err);
                setStats(prev => ({ ...prev, loading: false }));
            }
        }

        fetchStats();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const statCards = [
        {
            label: 'Total Revenue',
            value: stats.loading ? '...' : formatCurrency(stats.totalRevenue),
            icon: <TrendingUp size={24} />,
            color: '#10B981', // Emerald
        },
        {
            label: 'Total Orders',
            value: stats.loading ? '...' : stats.totalOrders,
            icon: <ShoppingCart size={24} />,
            color: '#F59E0B', // Amber
        },
        {
            label: 'Total Products',
            value: products.length,
            icon: <Package size={24} />,
            color: '#4F46E5', // Indigo
        },
        {
            label: 'Customers',
            value: stats.loading ? '...' : stats.totalCustomers,
            icon: <Users size={24} />,
            color: '#EF4444', // Red
        },
    ];

    return (
        <div className="admin-dashboard">
            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
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

            {/* Recent Products */}
            <div className="recent-section">
                <h2>Recent Products</h2>
                <div className="product-list">
                    {products.slice(0, 5).map(product => (
                        <div key={product.id} className="product-item">
                            <img src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} />
                            <div className="product-details">
                                <h4>{product.name}</h4>
                                <p>{product.category}</p>
                            </div>
                            <Link to={`/admin/products/${product.id}/edit`} className="btn btn--sm btn--secondary">
                                Edit
                            </Link>
                        </div>
                    ))}
                    {products.length === 0 && <p className="text-muted">No products found.</p>}
                </div>
            </div>
        </div>
    );
}

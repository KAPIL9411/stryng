
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Heart, LogOut, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

const navItems = [
    { icon: <User size={18} />, label: 'Profile', key: 'profile' },
    { icon: <Package size={18} />, label: 'Orders', key: 'orders' },
    { icon: <MapPin size={18} />, label: 'Addresses', key: 'addresses' },
    { icon: <Heart size={18} />, label: 'Wishlist', key: 'wishlist' },
];

export default function Account() {
    const { user, logout, fetchUserOrders } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [userOrders, setUserOrders] = useState([]);

    // Get display name from profile or user metadata
    const displayName = user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else {
            const loadOrders = async () => {
                const orders = await fetchUserOrders();
                setUserOrders(orders || []);
            };
            loadOrders();
        }
    }, [user, navigate, fetchUserOrders]);

    const handleLogout = async () => {
        try {
            await logout();
            // Clear any local storage if needed
            localStorage.removeItem('stryng-storage');
            // Force navigation to login
            navigate('/login', { replace: true });
            // Force page reload to clear all state
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (!user) return null;

    return (
        <div className="page">
            <div className="container">
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>My Account</h1>

                <div className="account">
                    {/* Sidebar */}
                    <nav className="account__nav">
                        <div style={{ padding: 'var(--space-4)', borderBottom: 'var(--border-thin)', marginBottom: 'var(--space-4)' }}>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Hello,</p>
                            <p style={{ fontWeight: 'var(--font-semibold)' }}>{displayName}</p>
                        </div>
                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                className={`account__nav-item ${activeTab === item.key ? 'account__nav-item--active' : ''}`}
                                onClick={() => setActiveTab(item.key)}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                        <button className="account__nav-item" style={{ color: 'var(--color-error)' }} onClick={handleLogout}>
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </nav>

                    {/* Content */}
                    <div className="account__content">
                        {activeTab === 'profile' && (
                            <>
                                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-6)', fontFamily: 'var(--font-primary)' }}>
                                    Personal Information
                                </h2>
                                <form onSubmit={(e) => e.preventDefault()} className="checkout__form-grid" style={{ maxWidth: '600px' }}>
                                    <div className="input-group">
                                        <label className="input-group__label">Full Name</label>
                                        <input type="text" className="input" defaultValue={displayName} />
                                    </div>
                                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-group__label">Email</label>
                                        <input type="email" className="input" defaultValue={user.email} disabled style={{ backgroundColor: 'var(--color-bg-secondary)', cursor: 'not-allowed' }} />
                                    </div>
                                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-group__label">Phone</label>
                                        <input type="tel" className="input" defaultValue="" placeholder="Add phone number" />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <button className="btn btn--primary">Save Changes</button>
                                    </div>
                                </form>
                            </>
                        )}

                        {activeTab === 'orders' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0, fontFamily: 'var(--font-primary)' }}>
                                        Order History
                                    </h2>
                                    {userOrders.length > 0 && (
                                        <Link to="/orders" className="btn btn--secondary btn--sm">
                                            View All Orders
                                        </Link>
                                    )}
                                </div>
                                {userOrders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-muted)' }}>
                                        <Package size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.3 }} />
                                        <p>No orders yet</p>
                                        <Link to="/products" className="btn btn--primary" style={{ marginTop: 'var(--space-4)', display: 'inline-block' }}>
                                            Start Shopping
                                        </Link>
                                    </div>
                                ) : (
                                    userOrders.slice(0, 3).map((order) => (
                                        <div key={order.id} style={{
                                            border: 'var(--border-thin)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
                                            marginBottom: 'var(--space-4)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                                                <div>
                                                    <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginBottom: '2px' }}>Order #{order.id?.slice(0, 8)}</p>
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 0 }}>
                                                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span className="badge badge--success" style={{ marginBottom: '4px', display: 'inline-block', textTransform: 'capitalize' }}>
                                                        {order.status}
                                                    </span>
                                                    <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginBottom: 0 }}>{formatPrice(order.total)}</p>
                                                </div>
                                            </div>
                                            {order.order_items && order.order_items.length > 0 && (
                                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                    {order.order_items.map((item, i) => (
                                                        <img
                                                            key={i}
                                                            src={item.product?.images?.[0] || '/placeholder.jpg'}
                                                            alt={item.product?.name || 'Product'}
                                                            style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--color-gray-100)' }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            <Link
                                                to={`/order/${order.id}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginTop: 'var(--space-3)', color: 'var(--color-text-primary)' }}
                                            >
                                                Track Order <ChevronRight size={14} />
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === 'addresses' && (
                            <>
                                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-6)', fontFamily: 'var(--font-primary)' }}>
                                    Saved Addresses
                                </h2>
                                <div className="checkout__form-grid">
                                    <div style={{ border: 'var(--border-thin)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                            <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>Home</span>
                                            <span className="badge badge--new">Default</span>
                                        </div>
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                                            {displayName}<br />
                                            42, MG Road, Block B<br />
                                            Bangalore, Karnataka - 560001<br />
                                            +91 98765 43210
                                        </p>
                                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                                            <button style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', textDecoration: 'underline' }}>Edit</button>
                                            <button style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', textDecoration: 'underline' }}>Remove</button>
                                        </div>
                                    </div>
                                    <button style={{
                                        border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-8)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', cursor: 'pointer',
                                        transition: 'border-color var(--transition-fast)',
                                    }}>
                                        <MapPin size={24} style={{ marginBottom: 'var(--space-2)' }} />
                                        Add New Address
                                    </button>
                                </div>
                            </>
                        )}

                        {activeTab === 'wishlist' && (
                            <>
                                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-6)', fontFamily: 'var(--font-primary)' }}>
                                    My Wishlist
                                </h2>
                                <p style={{ color: 'var(--color-text-muted)' }}>
                                    View your full wishlist <Link to="/wishlist" style={{ textDecoration: 'underline', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>here</Link>.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

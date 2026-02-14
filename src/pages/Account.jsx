
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Heart, LogOut, ChevronRight, Mail, Phone, Calendar, ShoppingBag, TrendingUp, Award } from 'lucide-react';
import useStore from '../store/useStore';
import SEO from '../components/SEO';
import { getUserAddresses } from '../api/addresses.api';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

const navItems = [
    { icon: <User size={20} />, label: 'Profile', key: 'profile', description: 'Manage your personal info' },
    { icon: <Package size={20} />, label: 'Orders', key: 'orders', description: 'Track & manage orders' },
    { icon: <MapPin size={20} />, label: 'Addresses', key: 'addresses', description: 'Saved delivery addresses' },
    { icon: <Heart size={20} />, label: 'Wishlist', key: 'wishlist', description: 'Your favorite items' },
];

export default function Account() {
    const { user, logout, fetchUserOrders } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [userOrders, setUserOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);

    // Get display name from profile or user metadata
    const displayName = user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const userEmail = user?.email || '';
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently';

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else {
            const loadOrders = async () => {
                setIsLoading(true);
                const orders = await fetchUserOrders();
                setUserOrders(orders || []);
                setIsLoading(false);
            };
            loadOrders();
        }
    }, [user, navigate, fetchUserOrders]);

    // Fetch addresses when addresses tab is active
    useEffect(() => {
        if (activeTab === 'addresses' && user) {
            const loadAddresses = async () => {
                setLoadingAddresses(true);
                const response = await getUserAddresses();
                if (response.success) {
                    setAddresses(response.data);
                }
                setLoadingAddresses(false);
            };
            loadAddresses();
        }
    }, [activeTab, user]);

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.removeItem('stryng-storage');
            navigate('/login', { replace: true });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (!user) return null;

    // Calculate user stats
    const totalOrders = userOrders.length;
    const totalSpent = userOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const completedOrders = userOrders.filter(o => o.status === 'delivered').length;

    return (
        <>
            <SEO 
                title="My Account - Stryng Clothing"
                description="Manage your account, orders, and preferences"
            />
            
            <div className="page account-page">
                <div className="container">
                    {/* Header Section */}
                    <div className="account-header">
                        <div className="account-header__user">
                            <div className="account-header__avatar">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="account-header__info">
                                <h1 className="account-header__name">Welcome back, {displayName}!</h1>
                                <p className="account-header__meta">
                                    <Mail size={14} /> {userEmail} • <Calendar size={14} /> Member since {memberSince}
                                </p>
                            </div>
                        </div>
                        <button className="btn btn--secondary" onClick={handleLogout}>
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="account-stats">
                        <div className="stat-card">
                            <div className="stat-card__icon stat-card__icon--primary">
                                <ShoppingBag size={24} />
                            </div>
                            <div className="stat-card__content">
                                <p className="stat-card__value">{totalOrders}</p>
                                <p className="stat-card__label">Total Orders</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__icon stat-card__icon--success">
                                <Package size={24} />
                            </div>
                            <div className="stat-card__content">
                                <p className="stat-card__value">{completedOrders}</p>
                                <p className="stat-card__label">Completed</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__icon stat-card__icon--accent">
                                <TrendingUp size={24} />
                            </div>
                            <div className="stat-card__content">
                                <p className="stat-card__value">{formatPrice(totalSpent)}</p>
                                <p className="stat-card__label">Total Spent</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__icon stat-card__icon--heart">
                                <Heart size={24} />
                            </div>
                            <div className="stat-card__content">
                                <p className="stat-card__value">0</p>
                                <p className="stat-card__label">Wishlist Items</p>
                            </div>
                        </div>
                    </div>

                    <div className="account-layout">
                        {/* Sidebar Navigation */}
                        <nav className="account-nav">
                            {navItems.map((item) => (
                                <button
                                    key={item.key}
                                    className={`account-nav__item ${activeTab === item.key ? 'account-nav__item--active' : ''}`}
                                    onClick={() => setActiveTab(item.key)}
                                >
                                    <div className="account-nav__item-icon">{item.icon}</div>
                                    <div className="account-nav__item-content">
                                        <span className="account-nav__item-label">{item.label}</span>
                                        <span className="account-nav__item-desc">{item.description}</span>
                                    </div>
                                    <ChevronRight size={18} className="account-nav__item-arrow" />
                                </button>
                            ))}
                        </nav>

                        {/* Content Area */}
                        <div className="account-content">
                            {activeTab === 'profile' && (
                                <div className="account-section">
                                    <div className="account-section__header">
                                        <h2>Personal Information</h2>
                                        <p>Update your personal details and contact information</p>
                                    </div>
                                    
                                    <form onSubmit={(e) => e.preventDefault()} className="account-form">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Full Name</label>
                                                <input type="text" className="form-input" defaultValue={displayName} placeholder="Enter your full name" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Phone Number</label>
                                                <input type="tel" className="form-input" placeholder="+91 98765 43210" />
                                            </div>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label className="form-label">Email Address</label>
                                            <input 
                                                type="email" 
                                                className="form-input" 
                                                defaultValue={userEmail} 
                                                disabled 
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', cursor: 'not-allowed' }} 
                                            />
                                            <small className="form-hint">Email cannot be changed</small>
                                        </div>

                                        <div className="form-actions">
                                            <button type="submit" className="btn btn--primary">
                                                Save Changes
                                            </button>
                                            <button type="button" className="btn btn--secondary">
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="account-section">
                                    <div className="account-section__header">
                                        <div>
                                            <h2>Order History</h2>
                                            <p>View and track all your orders</p>
                                        </div>
                                        {userOrders.length > 3 && (
                                            <Link to="/order-history" className="btn btn--secondary">
                                                View All Orders
                                            </Link>
                                        )}
                                    </div>

                                    {isLoading ? (
                                        <div className="loading-state">
                                            <div className="spinner"></div>
                                            <p>Loading orders...</p>
                                        </div>
                                    ) : userOrders.length === 0 ? (
                                        <div className="empty-state">
                                            <Package size={64} strokeWidth={1.5} />
                                            <h3>No Orders Yet</h3>
                                            <p>Start shopping and your orders will appear here</p>
                                            <Link to="/products" className="btn btn--primary">
                                                <ShoppingBag size={18} /> Start Shopping
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="orders-list">
                                            {userOrders.slice(0, 5).map((order) => (
                                                <div key={order.id} className="order-card">
                                                    <div className="order-card__header">
                                                        <div>
                                                            <p className="order-card__id">Order #{order.id?.slice(0, 12)}</p>
                                                            <p className="order-card__date">
                                                                {new Date(order.created_at).toLocaleDateString('en-IN', { 
                                                                    day: 'numeric', 
                                                                    month: 'long', 
                                                                    year: 'numeric' 
                                                                })}
                                                            </p>
                                                        </div>
                                                        <div className="order-card__status">
                                                            <span className={`status-badge status-badge--${order.status}`}>
                                                                {order.status}
                                                            </span>
                                                            <p className="order-card__total">{formatPrice(order.total)}</p>
                                                        </div>
                                                    </div>

                                                    {order.order_items && order.order_items.length > 0 && (
                                                        <div className="order-card__items">
                                                            {order.order_items.slice(0, 3).map((item, i) => (
                                                                <div key={i} className="order-item-preview">
                                                                    <img
                                                                        src={item.product?.images?.[0] || '/placeholder.jpg'}
                                                                        alt={item.product?.name || 'Product'}
                                                                    />
                                                                </div>
                                                            ))}
                                                            {order.order_items.length > 3 && (
                                                                <div className="order-item-preview order-item-preview--more">
                                                                    +{order.order_items.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <Link to={`/order-tracking?id=${order.id}`} className="order-card__action">
                                                        Track Order <ChevronRight size={16} />
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'addresses' && (
                                <div className="account-section">
                                    <div className="account-section__header">
                                        <div>
                                            <h2>Saved Addresses</h2>
                                            <p>Manage your delivery addresses</p>
                                        </div>
                                        <Link to="/addresses" className="btn btn--primary">
                                            <MapPin size={18} /> Add New Address
                                        </Link>
                                    </div>

                                    {loadingAddresses ? (
                                        <div className="loading-state">
                                            <div className="spinner"></div>
                                            <p>Loading addresses...</p>
                                        </div>
                                    ) : addresses.length === 0 ? (
                                        <div className="empty-state">
                                            <MapPin size={64} strokeWidth={1.5} />
                                            <h3>No Saved Addresses</h3>
                                            <p>Add your delivery addresses for faster checkout</p>
                                            <Link to="/addresses" className="btn btn--primary">
                                                Add Address
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="addresses-grid">
                                            {addresses.map((address) => (
                                                <div key={address.id} className="address-card-account">
                                                    <div className="address-card-account__header">
                                                        <span className="address-card-account__type">
                                                            {address.address_type || 'Home'}
                                                        </span>
                                                        {address.is_default && (
                                                            <span className="badge badge--success">Default</span>
                                                        )}
                                                    </div>
                                                    <div className="address-card-account__content">
                                                        <p className="address-card-account__name">{address.full_name}</p>
                                                        <p className="address-card-account__address">
                                                            {address.address_line1}
                                                            {address.address_line2 && `, ${address.address_line2}`}
                                                        </p>
                                                        {address.landmark && (
                                                            <p className="address-card-account__address">
                                                                Landmark: {address.landmark}
                                                            </p>
                                                        )}
                                                        <p className="address-card-account__address">
                                                            {address.city}, {address.state} - {address.pincode}
                                                        </p>
                                                        <p className="address-card-account__phone">
                                                            <Phone size={14} /> {address.phone}
                                                        </p>
                                                    </div>
                                                    <div className="address-card-account__actions">
                                                        <Link 
                                                            to="/addresses" 
                                                            className="address-card-account__action"
                                                        >
                                                            Edit
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'wishlist' && (
                                <div className="account-section">
                                    <div className="account-section__header">
                                        <div>
                                            <h2>My Wishlist</h2>
                                            <p>Items you've saved for later</p>
                                        </div>
                                        <Link to="/wishlist" className="btn btn--secondary">
                                            View Full Wishlist
                                        </Link>
                                    </div>

                                    <div className="empty-state">
                                        <Heart size={64} strokeWidth={1.5} />
                                        <h3>Your Wishlist is Empty</h3>
                                        <p>Save your favorite items to buy them later</p>
                                        <Link to="/products" className="btn btn--primary">
                                            Browse Products
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            <style>{`
                .account-page {
                    background: var(--color-bg-secondary);
                }

                /* Header Section */
                .account-header {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    padding: 2rem;
                    margin-bottom: 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }

                .account-header__user {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .account-header__avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--color-accent) 0%, rgba(201, 169, 110, 0.7) 100%);
                    color: var(--color-text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: var(--font-bold);
                    flex-shrink: 0;
                }

                .account-header__name {
                    font-size: 1.75rem;
                    margin: 0 0 0.5rem 0;
                    font-weight: var(--font-bold);
                }

                .account-header__meta {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    color: var(--color-text-secondary);
                    font-size: 0.9375rem;
                    margin: 0;
                }

                .account-header__meta svg {
                    display: inline;
                    vertical-align: middle;
                }

                /* Stats Cards */
                .account-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }

                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .stat-card__icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .stat-card__icon--primary {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }

                .stat-card__icon--success {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }

                .stat-card__icon--accent {
                    background: rgba(201, 169, 110, 0.1);
                    color: var(--color-accent);
                }

                .stat-card__icon--heart {
                    background: rgba(220, 38, 38, 0.1);
                    color: #dc2626;
                }

                .stat-card__value {
                    font-size: 1.75rem;
                    font-weight: var(--font-bold);
                    margin: 0 0 0.25rem 0;
                }

                .stat-card__label {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                /* Layout */
                .account-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 2rem;
                    align-items: start;
                }

                /* Navigation */
                .account-nav {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    position: sticky;
                    top: 100px;
                }

                .account-nav__item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    border: none;
                    background: none;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-left: 3px solid transparent;
                    position: relative;
                }

                .account-nav__item:hover {
                    background: var(--color-bg-secondary);
                }

                .account-nav__item--active {
                    background: rgba(201, 169, 110, 0.05);
                    border-left-color: var(--color-accent);
                }

                .account-nav__item-icon {
                    color: var(--color-text-secondary);
                    flex-shrink: 0;
                }

                .account-nav__item--active .account-nav__item-icon {
                    color: var(--color-accent);
                }

                .account-nav__item-content {
                    flex: 1;
                }

                .account-nav__item-label {
                    display: block;
                    font-weight: var(--font-medium);
                    margin-bottom: 0.125rem;
                }

                .account-nav__item-desc {
                    display: block;
                    font-size: 0.8125rem;
                    color: var(--color-text-secondary);
                }

                .account-nav__item-arrow {
                    color: var(--color-text-secondary);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .account-nav__item:hover .account-nav__item-arrow,
                .account-nav__item--active .account-nav__item-arrow {
                    opacity: 1;
                }

                /* Content Area */
                .account-content {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    min-height: 500px;
                }

                .account-section {
                    padding: 2rem;
                }

                .account-section__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .account-section__header h2 {
                    font-size: 1.5rem;
                    margin: 0 0 0.5rem 0;
                    font-weight: var(--font-semibold);
                }

                .account-section__header p {
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                /* Form Styles */
                .account-form {
                    max-width: 600px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-label {
                    display: block;
                    font-weight: var(--font-medium);
                    margin-bottom: 0.5rem;
                    font-size: 0.9375rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--color-border);
                    font-size: 1rem;
                    transition: border-color 0.3s ease;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--color-accent);
                }

                .form-hint {
                    display: block;
                    margin-top: 0.5rem;
                    font-size: 0.8125rem;
                    color: var(--color-text-secondary);
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2rem;
                }

                /* Orders List */
                .orders-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .order-card {
                    border: 1px solid var(--color-border);
                    padding: 1.5rem;
                    transition: all 0.3s ease;
                }

                .order-card:hover {
                    border-color: var(--color-accent);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .order-card__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }

                .order-card__id {
                    font-weight: var(--font-semibold);
                    margin: 0 0 0.25rem 0;
                }

                .order-card__date {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                .order-card__status {
                    text-align: right;
                }

                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    font-size: 0.75rem;
                    font-weight: var(--font-semibold);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.5rem;
                }

                .status-badge--pending,
                .status-badge--payment_pending {
                    background: rgba(234, 179, 8, 0.1);
                    color: #eab308;
                }

                .status-badge--confirmed,
                .status-badge--processing {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }

                .status-badge--shipped,
                .status-badge--out_for_delivery {
                    background: rgba(168, 85, 247, 0.1);
                    color: #a855f7;
                }

                .status-badge--delivered {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }

                .status-badge--cancelled,
                .status-badge--failed {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                .order-card__total {
                    font-weight: var(--font-semibold);
                    margin: 0;
                }

                .order-card__items {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .order-item-preview {
                    width: 60px;
                    height: 80px;
                    border: 1px solid var(--color-border);
                    overflow: hidden;
                }

                .order-item-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .order-item-preview--more {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--color-bg-secondary);
                    font-size: 0.875rem;
                    font-weight: var(--font-semibold);
                    color: var(--color-text-secondary);
                }

                .order-card__action {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9375rem;
                    font-weight: var(--font-medium);
                    color: var(--color-text-primary);
                    text-decoration: none;
                    transition: gap 0.3s ease;
                }

                .order-card__action:hover {
                    gap: 0.75rem;
                }

                /* Empty State */
                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--color-text-secondary);
                }

                .empty-state svg {
                    opacity: 0.3;
                    margin-bottom: 1.5rem;
                }

                .empty-state h3 {
                    font-size: 1.25rem;
                    margin: 0 0 0.5rem 0;
                    color: var(--color-text-primary);
                }

                .empty-state p {
                    margin: 0 0 1.5rem 0;
                }

                /* Addresses Grid */
                .addresses-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .address-card-account {
                    border: 1px solid var(--color-border);
                    padding: 1.5rem;
                    transition: all 0.3s ease;
                }

                .address-card-account:hover {
                    border-color: var(--color-accent);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .address-card-account__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .address-card-account__type {
                    font-weight: var(--font-semibold);
                    text-transform: capitalize;
                    font-size: 0.9375rem;
                }

                .address-card-account__content {
                    margin-bottom: 1rem;
                }

                .address-card-account__name {
                    font-weight: var(--font-semibold);
                    margin: 0 0 0.5rem 0;
                }

                .address-card-account__address {
                    font-size: 0.9375rem;
                    color: var(--color-text-secondary);
                    margin: 0.25rem 0;
                    line-height: 1.5;
                }

                .address-card-account__phone {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9375rem;
                    color: var(--color-text-secondary);
                    margin: 0.5rem 0 0 0;
                }

                .address-card-account__actions {
                    display: flex;
                    gap: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--color-border);
                }

                .address-card-account__action {
                    font-size: 0.9375rem;
                    font-weight: var(--font-medium);
                    color: var(--color-text-primary);
                    text-decoration: none;
                    transition: color 0.3s ease;
                }

                .address-card-account__action:hover {
                    color: var(--color-accent);
                }

                /* Loading State */
                .loading-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .loading-state .spinner {
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 1rem;
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .account-layout {
                        grid-template-columns: 1fr;
                    }

                    .account-nav {
                        position: static;
                    }

                    .account-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .account-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .account-header__user {
                        width: 100%;
                    }

                    .account-header__avatar {
                        width: 60px;
                        height: 60px;
                        font-size: 1.5rem;
                    }

                    .account-header__name {
                        font-size: 1.25rem;
                    }

                    .account-stats {
                        grid-template-columns: 1fr;
                    }

                    .account-section {
                        padding: 1.5rem;
                    }

                    .account-section__header {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .form-actions .btn {
                        width: 100%;
                    }
                }
            `}</style>
        </>
    );
}

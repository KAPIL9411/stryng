import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  ShoppingBag,
} from 'lucide-react';
import useStore from '../store/useStore';
import SEO from '../components/SEO';
import { getUserAddresses } from '../api/addresses.api';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

const navItems = [
  {
    icon: <User size={20} />,
    label: 'Profile',
    key: 'profile',
  },
  {
    icon: <Package size={20} />,
    label: 'Orders',
    key: 'orders',
  },
  {
    icon: <MapPin size={20} />,
    label: 'Addresses',
    key: 'addresses',
  },
  {
    icon: <Heart size={20} />,
    label: 'Wishlist',
    key: 'wishlist',
  },
];

export default function Account() {
  const { user, logout, fetchUserOrders } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [userOrders, setUserOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const displayName =
    user?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';
  const userEmail = user?.email || '';

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

  const totalOrders = userOrders.length;
  const totalSpent = userOrders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );

  return (
    <>
      <SEO
        title="My Account - Stryng Clothing"
        description="Manage your account, orders, and preferences"
      />

      <div className="page account-page">
        <div className="container">
          {/* Header */}
          <div className="account-header">
            <div className="account-header__user">
              <div className="account-header__avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="account-header__info">
                <h1 className="account-header__name">
                  {displayName}
                </h1>
                <p className="account-header__email">
                  {userEmail}
                </p>
              </div>
            </div>
            <div className="account-header__actions">
              <div className="account-header__stats">
                <div className="stat-mini">
                  <span className="stat-mini__value">{totalOrders}</span>
                  <span className="stat-mini__label">Orders</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-mini__value">{formatPrice(totalSpent)}</span>
                  <span className="stat-mini__label">Spent</span>
                </div>
              </div>
              <button className="btn btn--secondary" onClick={handleLogout}>
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>

          <div className="account-layout">
            {/* Navigation */}
            <nav className="account-nav">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  className={`account-nav__item ${activeTab === item.key ? 'account-nav__item--active' : ''}`}
                  onClick={() => setActiveTab(item.key)}
                >
                  <div className="account-nav__item-icon">{item.icon}</div>
                  <span className="account-nav__item-label">
                    {item.label}
                  </span>
                  <ChevronRight size={18} className="account-nav__item-arrow" />
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="account-content">
              {activeTab === 'profile' && (
                <div className="account-section">
                  <h2 className="account-section__title">Personal Information</h2>

                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="account-form"
                  >
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-input"
                        defaultValue={displayName}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        defaultValue={userEmail}
                        disabled
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          cursor: 'not-allowed',
                        }}
                      />
                      <small className="form-hint">
                        Email cannot be changed
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn--primary">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="account-section">
                  <div className="account-section__header">
                    <h2 className="account-section__title">Order History</h2>
                    {userOrders.length > 3 && (
                      <Link to="/order-history" className="btn btn--secondary btn--sm">
                        View All
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
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                    <div className="orders-list">
                      {userOrders.slice(0, 5).map((order) => (
                        <div key={order.id} className="order-card">
                          <div className="order-card__header">
                            <div>
                              <p className="order-card__id">
                                #{order.id?.slice(0, 12)}
                              </p>
                              <p className="order-card__date">
                                {new Date(order.created_at).toLocaleDateString(
                                  'en-IN',
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  }
                                )}
                              </p>
                            </div>
                            <div className="order-card__status">
                              <span
                                className={`status-badge status-badge--${order.status}`}
                              >
                                {order.status}
                              </span>
                              <p className="order-card__total">
                                {formatPrice(order.total)}
                              </p>
                            </div>
                          </div>

                          {order.order_items &&
                            order.order_items.length > 0 && (
                              <div className="order-card__items">
                                {order.order_items
                                  .slice(0, 3)
                                  .map((item, i) => (
                                    <div key={i} className="order-item-preview">
                                      <img
                                        src={
                                          item.product?.images?.[0] ||
                                          '/placeholder.jpg'
                                        }
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

                          <Link
                            to={`/order-tracking?id=${order.id}`}
                            className="order-card__action"
                          >
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
                    <h2 className="account-section__title">Saved Addresses</h2>
                    <Link to="/addresses" className="btn btn--primary btn--sm">
                      Add New
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
                        <div key={address.id} className="address-card">
                          <div className="address-card__header">
                            <span className="address-card__type">
                              {address.address_type || 'Home'}
                            </span>
                            {address.is_default && (
                              <span className="badge badge--success">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="address-card__content">
                            <p className="address-card__name">
                              {address.full_name}
                            </p>
                            <p className="address-card__address">
                              {address.address_line1}
                              {address.address_line2 &&
                                `, ${address.address_line2}`}
                            </p>
                            <p className="address-card__address">
                              {address.city}, {address.state} -{' '}
                              {address.pincode}
                            </p>
                            <p className="address-card__phone">
                              <Phone size={14} /> {address.phone}
                            </p>
                          </div>
                          <Link
                            to="/addresses"
                            className="address-card__action"
                          >
                            Edit
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="account-section">
                  <div className="account-section__header">
                    <h2 className="account-section__title">My Wishlist</h2>
                    <Link to="/wishlist" className="btn btn--secondary btn--sm">
                      View All
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
          min-height: 80vh;
        }

        /* Header */
        .account-header {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem 2rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .account-header__user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .account-header__avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-accent) 0%, rgba(201, 169, 110, 0.7) 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: var(--font-bold);
          flex-shrink: 0;
        }

        .account-header__info {
          flex: 1;
        }

        .account-header__name {
          font-size: 1.25rem;
          margin: 0 0 0.25rem 0;
          font-weight: var(--font-semibold);
        }

        .account-header__email {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }

        .account-header__actions {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .account-header__stats {
          display: flex;
          gap: 2rem;
          padding-right: 2rem;
          border-right: 1px solid var(--color-border);
        }

        .stat-mini {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-mini__value {
          font-size: 1.25rem;
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
        }

        .stat-mini__label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Stats - Removed */
        .account-stats {
          display: none;
        }

        /* Layout */
        .account-layout {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
          align-items: start;
        }

        /* Navigation */
        .account-nav {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
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
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .account-nav__item:hover {
          background: var(--color-bg-secondary);
        }

        .account-nav__item--active {
          background: rgba(201, 169, 110, 0.08);
          border-left-color: var(--color-accent);
        }

        .account-nav__item-icon {
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }

        .account-nav__item--active .account-nav__item-icon {
          color: var(--color-accent);
        }

        .account-nav__item-label {
          flex: 1;
          font-weight: var(--font-medium);
        }

        .account-nav__item-arrow {
          color: var(--color-text-secondary);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .account-nav__item:hover .account-nav__item-arrow,
        .account-nav__item--active .account-nav__item-arrow {
          opacity: 1;
        }

        /* Content */
        .account-content {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          min-height: 500px;
        }

        .account-section {
          padding: 2rem;
        }

        .account-section__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .account-section__title {
          font-size: 1.5rem;
          margin: 0;
          font-weight: var(--font-semibold);
        }

        /* Form */
        .account-form {
          max-width: 500px;
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
          border-radius: var(--radius-md);
          font-size: 1rem;
          transition: border-color 0.2s ease;
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
          margin-top: 2rem;
        }

        /* Orders */
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .order-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          transition: all 0.2s ease;
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
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: var(--font-semibold);
          text-transform: capitalize;
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
          border-radius: var(--radius-sm);
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
          transition: gap 0.2s ease;
        }

        .order-card__action:hover {
          gap: 0.75rem;
          color: var(--color-accent);
        }

        /* Addresses */
        .addresses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .address-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .address-card:hover {
          border-color: var(--color-accent);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .address-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
        }

        .address-card__type {
          font-weight: var(--font-semibold);
          text-transform: capitalize;
        }

        .address-card__content {
          margin-bottom: 1rem;
        }

        .address-card__name {
          font-weight: var(--font-semibold);
          margin: 0 0 0.5rem 0;
        }

        .address-card__address {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0.25rem 0;
          line-height: 1.5;
        }

        .address-card__phone {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0.5rem 0 0 0;
        }

        .address-card__action {
          display: inline-block;
          font-size: 0.9375rem;
          font-weight: var(--font-medium);
          color: var(--color-text-primary);
          text-decoration: none;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
          transition: color 0.2s ease;
        }

        .address-card__action:hover {
          color: var(--color-accent);
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

        /* Loading */
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
            display: grid;
            grid-template-columns: repeat(4, 1fr);
          }

          .account-nav__item {
            flex-direction: column;
            text-align: center;
            padding: 1rem;
            gap: 0.5rem;
          }

          .account-nav__item-arrow {
            display: none;
          }

          .account-header__stats {
            padding-right: 1.5rem;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .account-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 1.5rem;
          }

          .account-header__user {
            width: 100%;
          }

          .account-header__avatar {
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
          }

          .account-header__name {
            font-size: 1.125rem;
          }

          .account-header__email {
            font-size: 0.8125rem;
          }

          .account-header__actions {
            width: 100%;
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .account-header__stats {
            width: 100%;
            justify-content: space-around;
            padding: 1rem 0;
            border-right: none;
            border-bottom: 1px solid var(--color-border);
          }

          .account-nav {
            grid-template-columns: repeat(2, 1fr);
          }

          .account-section {
            padding: 1.5rem;
          }

          .account-section__header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>
    </>
  );
}

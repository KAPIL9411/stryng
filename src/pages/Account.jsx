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
  Edit,
} from 'lucide-react';
import useStore from '../store/useStore';
import SEO from '../components/SEO';
import { getUserAddresses } from '../api/addresses.api';
import { formatDate } from '../utils/format';
import '../styles/account.css';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function Account() {
  const { user, logout, fetchUserOrders } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [userOrders, setUserOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

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
      setFullName(user?.full_name || displayName);
      setPhone(user?.phone || '');
      
      if (!dataLoaded) {
        const loadData = async () => {
          setIsLoading(true);
          setLoadingAddresses(true);
          
          const [orders, addressesResponse] = await Promise.all([
            fetchUserOrders(),
            getUserAddresses()
          ]);
          
          setUserOrders(orders || []);
          
          if (addressesResponse.success) {
            setAddresses(addressesResponse.data);
          }
          
          setIsLoading(false);
          setLoadingAddresses(false);
          setDataLoaded(true);
        };
        
        loadData();
      }
    }
  }, [user, navigate, fetchUserOrders, dataLoaded, displayName]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('stryng-storage');
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      const { updateUserProfile } = await import('../api/auth.api');
      
      const profileData = {
        full_name: fullName.trim(),
        phone: phone.trim(),
      };

      const { error } = await updateUserProfile(profileData);

      if (error) {
        setProfileError(error);
        return;
      }

      const updatedUser = {
        ...user,
        full_name: fullName.trim(),
        phone: phone.trim(),
        displayName: fullName.trim(),
      };

      useStore.setState({ user: updatedUser });

      const { showToast } = useStore.getState();
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
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
          {/* Profile Header */}
          <div className="account-profile-header">
            <div className="account-profile-content">
              <div className="account-profile-user">
                <div className="account-profile-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="account-profile-info">
                  <h1>{displayName}</h1>
                  <p>
                    <Mail size={16} />
                    {userEmail}
                  </p>
                </div>
              </div>

              <div className="account-profile-actions">
                <div className="account-stats-mini">
                  <div className="stat-item">
                    <span className="stat-item__value">{totalOrders}</span>
                    <span className="stat-item__label">Orders</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item__value">{formatPrice(totalSpent)}</span>
                    <span className="stat-item__label">Total Spent</span>
                  </div>
                </div>
                <button className="btn-logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="account-tabs">
            <button
              className={`account-tab ${activeTab === 'profile' ? 'account-tab--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={20} />
              Profile
            </button>
            <button
              className={`account-tab ${activeTab === 'orders' ? 'account-tab--active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <Package size={20} />
              Orders
            </button>
            <button
              className={`account-tab ${activeTab === 'addresses' ? 'account-tab--active' : ''}`}
              onClick={() => setActiveTab('addresses')}
            >
              <MapPin size={20} />
              Addresses
            </button>
            <button
              className={`account-tab ${activeTab === 'wishlist' ? 'account-tab--active' : ''}`}
              onClick={() => setActiveTab('wishlist')}
            >
              <Heart size={20} />
              Wishlist
            </button>
          </div>

          {/* Content */}
          <div className="account-content-wrapper">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">Personal Information</h2>
                </div>

                {profileError && (
                  <div style={{
                    backgroundColor: '#FEE2E2',
                    border: '2px solid #FCA5A5',
                    color: '#991B1B',
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    fontWeight: 500,
                  }}>
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleProfileUpdate} className="profile-form">
                  <div className="form-row">
                    <div className="form-field">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-field form-field--full">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                    />
                    <span className="form-field-hint">
                      Email cannot be changed
                    </span>
                  </div>

                  <div className="form-actions-row">
                    <button 
                      type="submit" 
                      className="btn-save"
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">Order History</h2>
                  {userOrders.length > 3 && (
                    <Link to="/order-history" className="btn btn--secondary btn--sm">
                      View All Orders
                    </Link>
                  )}
                </div>

                {isLoading ? (
                  <div className="loading-state-modern">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading your orders...</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="empty-state-modern">
                    <div className="empty-state-icon">
                      <Package size={40} />
                    </div>
                    <h3 className="empty-state-title">No Orders Yet</h3>
                    <p className="empty-state-text">
                      Start shopping and your orders will appear here
                    </p>
                    <Link to="/products" className="btn-empty-action">
                      <ShoppingBag size={20} />
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="orders-grid">
                    {userOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="order-item">
                        <div className="order-item-header">
                          <div>
                            <p className="order-item-id">
                              Order #{order.order_number || order.id?.slice(0, 12)}
                            </p>
                            <p className="order-item-date">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <div className="order-item-status-wrapper">
                            <span className={`order-status-badge order-status-badge--${order.status}`}>
                              {order.status}
                            </span>
                            <p className="order-item-total">
                              {formatPrice(order.total)}
                            </p>
                          </div>
                        </div>

                        {order.order_items && order.order_items.length > 0 && (
                          <div className="order-item-products">
                            {order.order_items.slice(0, 3).map((item, i) => (
                              <div key={i} className="order-product-thumb">
                                <img
                                  src={
                                    item.product_image ||
                                    item.product?.images?.[0] ||
                                    '/placeholder.jpg'
                                  }
                                  alt={item.product_name || 'Product'}
                                />
                              </div>
                            ))}
                            {order.order_items.length > 3 && (
                              <div className="order-product-more">
                                +{order.order_items.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        <Link to={`/order/${order.id}`} className="order-item-action">
                          Track Order
                          <ChevronRight size={18} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">Saved Addresses</h2>
                  <Link to="/addresses" className="btn btn--primary btn--sm">
                    Add New Address
                  </Link>
                </div>

                {loadingAddresses ? (
                  <div className="loading-state-modern">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading addresses...</p>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="empty-state-modern">
                    <div className="empty-state-icon">
                      <MapPin size={40} />
                    </div>
                    <h3 className="empty-state-title">No Saved Addresses</h3>
                    <p className="empty-state-text">
                      Add your delivery addresses for faster checkout
                    </p>
                    <Link to="/addresses" className="btn-empty-action">
                      <MapPin size={20} />
                      Add Address
                    </Link>
                  </div>
                ) : (
                  <div className="addresses-list">
                    {addresses.map((address) => (
                      <div key={address.id} className="address-item">
                        <div className="address-item-header">
                          <span className="address-type-badge">
                            {address.address_type || 'Home'}
                          </span>
                          {address.is_default && (
                            <span className="address-default-badge">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="address-item-body">
                          <p className="address-name">{address.full_name}</p>
                          <p className="address-text">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="address-text">
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="address-phone">
                            <Phone size={16} />
                            {address.phone}
                          </p>
                        </div>
                        <div className="address-item-footer">
                          <Link to="/addresses" className="address-edit-link">
                            <Edit size={16} />
                            Edit Address
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">My Wishlist</h2>
                </div>

                <div className="empty-state-modern">
                  <div className="empty-state-icon">
                    <Heart size={40} />
                  </div>
                  <h3 className="empty-state-title">Your Wishlist is Empty</h3>
                  <p className="empty-state-text">
                    Save your favorite items to buy them later
                  </p>
                  <Link to="/products" className="btn-empty-action">
                    <ShoppingBag size={20} />
                    Browse Products
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

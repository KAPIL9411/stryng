import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { getCoupons, deleteCoupon, toggleCouponStatus } from '../../api/admin/coupons.admin.api';
import '../../styles/admin-coupons.css';

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString('en-IN')}`;
const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const data = await getCoupons({ status: filter, search: searchQuery });
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCoupons();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this coupon?`)) {
      try {
        await toggleCouponStatus(id);
        fetchCoupons();
      } catch (error) {
        alert(error.message || 'Failed to toggle coupon status');
      }
    }
  };

  const handleDelete = async (id, usedCount) => {
    if (usedCount > 0) {
      alert('Cannot delete coupon that has been used');
      return;
    }
    if (window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      try {
        await deleteCoupon(id);
        fetchCoupons();
      } catch (error) {
        alert(error.message || 'Failed to delete coupon');
      }
    }
  };

  const getStatusBadge = (coupon) => {
    const now = new Date();
    const endDate = new Date(coupon.end_date);
    
    if (!coupon.is_active) {
      return <span className="status-badge status-inactive">Inactive</span>;
    }
    if (now > endDate) {
      return <span className="status-badge status-expired">Expired</span>;
    }
    return <span className="status-badge status-active">Active</span>;
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="admin-coupons">
      <div className="coupons-header">
        <div>
          <h1>Coupon Management</h1>
          <p>Create and manage discount coupons for your store</p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleRefresh}
            className={`btn-refresh ${refreshing ? 'refreshing' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <Link to="/admin/coupons/new" className="btn-primary">
            <Plus size={18} />
            Create Coupon
          </Link>
        </div>
      </div>

      <div className="coupons-filters">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
            onClick={() => setFilter('expired')}
          >
            Expired
          </button>
          <button
            className={`filter-btn ${filter === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilter('inactive')}
          >
            Inactive
          </button>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by coupon code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="coupons-table-container">
          <table className="coupons-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton skeleton-text"></div></td>
                  <td><div className="skeleton skeleton-badge"></div></td>
                  <td><div className="skeleton skeleton-text"></div></td>
                  <td><div className="skeleton skeleton-text"></div></td>
                  <td><div className="skeleton skeleton-text"></div></td>
                  <td><div className="skeleton skeleton-text"></div></td>
                  <td><div className="skeleton skeleton-badge"></div></td>
                  <td><div className="skeleton skeleton-actions"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <h3>No coupons found</h3>
          <p>
            {searchQuery
              ? `No coupons match "${searchQuery}". Try a different search term.`
              : filter === 'all'
              ? 'Get started by creating your first coupon to offer discounts to customers.'
              : `No ${filter} coupons available.`}
          </p>
          {!searchQuery && filter === 'all' && (
            <Link to="/admin/coupons/new" className="btn-primary">
              <Plus size={18} />
              Create Your First Coupon
            </Link>
          )}
        </div>
      ) : (
        <div className="coupons-table-container">
          <table className="coupons-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <div className="coupon-code-cell">
                      <span className="coupon-code">{coupon.code}</span>
                      {coupon.description && (
                        <span className="coupon-description">{coupon.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">
                      {coupon.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </span>
                  </td>
                  <td>
                    <div className="discount-cell">
                      <span className="discount-value">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : formatPrice(coupon.discount_value)}
                      </span>
                      {coupon.discount_type === 'percentage' && coupon.max_discount && (
                        <span className="max-discount">Max: {formatPrice(coupon.max_discount)}</span>
                      )}
                    </div>
                  </td>
                  <td>{formatPrice(coupon.min_order_value)}</td>
                  <td>
                    <div className="validity-cell">
                      <span>{formatDate(coupon.start_date)}</span>
                      <span className="date-separator">to</span>
                      <span>{formatDate(coupon.end_date)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="usage-cell">
                      <span className="usage-count">
                        {coupon.used_count} / {coupon.max_uses || '∞'}
                      </span>
                      <span className="usage-per-user">
                        Max {coupon.max_uses_per_user} per user
                      </span>
                    </div>
                  </td>
                  <td>{getStatusBadge(coupon)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        to={`/admin/coupons/${coupon.id}/edit`}
                        className="btn-icon"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                        className="btn-icon"
                        title={coupon.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.is_active ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id, coupon.used_count)}
                        className="btn-icon btn-danger"
                        title="Delete"
                        disabled={coupon.used_count > 0}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Home,
  Briefcase,
  MapPinned,
  Check,
  X,
  Loader,
  Star,
  Navigation,
} from 'lucide-react';
import useStore from '../store/useStore';
import SEO from '../components/SEO';
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../api/addresses.api';

export default function Addresses() {
  const { showToast } = useStore();
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    pincode: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    address_type: 'home',
    is_default: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const response = await getUserAddresses();
    if (response.success) {
      setAddresses(response.data);
    } else {
      showToast('Failed to load addresses', 'error');
    }
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData({
      full_name: '',
      phone: '',
      pincode: '',
      address_line1: '',
      address_line2: '',
      landmark: '',
      city: '',
      state: '',
      address_type: 'home',
      is_default: addresses.length === 0,
    });
    setShowForm(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData(address);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let response;
      if (editingAddress) {
        response = await updateAddress(editingAddress.id, formData);
      } else {
        response = await addAddress(formData);
      }

      if (response.success) {
        showToast(
          editingAddress
            ? 'Address updated successfully'
            : 'Address added successfully',
          'success'
        );
        setShowForm(false);
        fetchAddresses();
      } else {
        showToast(response.error || 'Failed to save address', 'error');
      }
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    setDeletingId(addressId);
    const response = await deleteAddress(addressId);
    if (response.success) {
      showToast('Address deleted successfully', 'success');
      fetchAddresses();
    } else {
      showToast('Failed to delete address', 'error');
    }
    setDeletingId(null);
  };

  const handleSetDefault = async (addressId) => {
    const response = await setDefaultAddress(addressId);
    if (response.success) {
      showToast('Default address updated', 'success');
      fetchAddresses();
    } else {
      showToast('Failed to update default address', 'error');
    }
  };

  const getAddressIcon = (type) => {
    switch (type) {
      case 'home':
        return <Home size={20} />;
      case 'work':
        return <Briefcase size={20} />;
      default:
        return <MapPinned size={20} />;
    }
  };

  return (
    <>
      <SEO
        title="My Addresses - Stryng Clothing"
        description="Manage your delivery addresses"
      />

      <div className="page">
        <div className="container">
          {/* Header */}
          <div className="page-header">
            <div className="page-header__content">
              <div className="page-header__icon">
                <MapPin size={24} />
              </div>
              <div>
                <h1 className="page-header__title">My Addresses</h1>
                <p className="page-header__subtitle">Manage your delivery addresses</p>
              </div>
            </div>
            {!showForm && (
              <button onClick={handleAddNew} className="btn btn--primary">
                <Plus size={18} />
                <span>Add New Address</span>
              </button>
            )}
          </div>

          {/* Form or Address List */}
          {showForm ? (
            <AddressForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              submitting={submitting}
              isEditing={!!editingAddress}
            />
          ) : (
            <div className="addresses-list">
              {addresses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <MapPin size={64} strokeWidth={1.5} />
                  </div>
                  <h2 className="empty-state__title">No addresses saved</h2>
                  <p className="empty-state__text">Add your first delivery address to get started with faster checkout</p>
                  <button onClick={handleAddNew} className="btn btn--primary">
                    <Plus size={18} />
                    Add Your First Address
                  </button>
                </div>
              ) : (
                <div className="addresses-grid">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      onEdit={() => handleEdit(address)}
                      onDelete={() => handleDelete(address.id)}
                      onSetDefault={() => handleSetDefault(address.id)}
                      getIcon={getAddressIcon}
                      isDeleting={deletingId === address.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ============================================
           ADDRESSES PAGE STYLES
           ============================================ */

        /* Page Header */
        .page-header {
          background: var(--color-bg-primary);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: var(--space-6) var(--space-8);
          margin-bottom: var(--space-8);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-6);
        }

        .page-header__content {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .page-header__icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          background: rgba(201, 169, 110, 0.1);
          color: var(--color-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .page-header__title {
          font-size: var(--text-2xl);
          margin: 0 0 var(--space-1) 0;
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-tight);
          line-height: 1.2;
        }

        .page-header__subtitle {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          margin: 0;
          line-height: 1.5;
        }

        /* Empty State */
        .empty-state {
          background: var(--color-bg-primary);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: var(--space-16) var(--space-8);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .empty-state__icon {
          width: 120px;
          height: 120px;
          margin: 0 0 var(--space-8) 0;
          border-radius: var(--radius-full);
          background: rgba(201, 169, 110, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent);
        }

        .empty-state__title {
          font-size: var(--text-2xl);
          font-weight: var(--font-semibold);
          margin: 0 0 var(--space-3) 0;
          text-transform: uppercase;
          letter-spacing: var(--tracking-tight);
          text-align: center;
          width: 100%;
        }

        .empty-state__text {
          color: var(--color-text-secondary);
          font-size: var(--text-base);
          margin: 0 0 var(--space-8) 0;
          max-width: 400px;
          line-height: var(--leading-relaxed);
          text-align: center;
        }

        /* Addresses List Container */
        .addresses-list {
          background: var(--color-bg-primary);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
        }

        .addresses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: var(--space-6);
        }

        /* Address Card */
        .address-card {
          border: var(--border-thin);
          border-radius: var(--radius-md);
          padding: var(--space-6);
          transition: all var(--transition-base);
          background: var(--color-bg-primary);
          position: relative;
        }

        .address-card:hover {
          border-color: var(--color-accent);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .address-card--default {
          border-color: var(--color-accent);
          background: rgba(201, 169, 110, 0.03);
        }

        .address-card--default::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-light) 100%);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .address-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
          padding-bottom: var(--space-4);
          border-bottom: var(--border-thin);
        }

        .address-card__type {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          font-size: var(--text-xs);
          color: var(--color-text-primary);
        }

        .address-card__type svg {
          color: var(--color-accent);
        }

        .address-card__body {
          margin-bottom: var(--space-4);
        }

        .address-card__name {
          font-weight: var(--font-semibold);
          margin: 0 0 var(--space-3) 0;
          font-size: var(--text-lg);
          color: var(--color-text-primary);
          line-height: 1.3;
        }

        .address-card__details {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .address-card__text {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 0;
          line-height: var(--leading-relaxed);
        }

        .address-card__landmark,
        .address-card__phone {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
        }

        .address-card__landmark svg,
        .address-card__phone svg {
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .address-card__actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding-top: var(--space-4);
          border-top: var(--border-thin);
        }

        /* Address Form */
        .address-form {
          background: var(--color-bg-primary);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
        }

        .address-form__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-6);
          margin-bottom: var(--space-8);
          padding-bottom: var(--space-6);
          border-bottom: var(--border-thin);
        }

        .address-form__title {
          font-size: var(--text-2xl);
          font-weight: var(--font-semibold);
          margin: 0 0 var(--space-2) 0;
          text-transform: uppercase;
          letter-spacing: var(--tracking-tight);
          line-height: 1.2;
        }

        .address-form__subtitle {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          margin: 0;
          line-height: 1.5;
        }

        /* Info Banner */
        .info-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-5);
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: var(--radius-md);
          color: #1e40af;
          font-size: var(--text-sm);
          margin-bottom: var(--space-8);
        }

        .info-banner svg {
          flex-shrink: 0;
          color: #3b82f6;
        }

        /* Form Sections */
        .form-section {
          margin-bottom: var(--space-8);
        }

        .form-section__title {
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          margin: 0 0 var(--space-4) 0;
          color: var(--color-text-primary);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          line-height: 1.3;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-4);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-label {
          font-weight: var(--font-medium);
          font-size: var(--text-sm);
          color: var(--color-text-primary);
        }

        .form-required {
          color: var(--color-error);
        }

        .form-input {
          padding: var(--space-3) var(--space-4);
          border: var(--border-thin);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          transition: border-color var(--transition-fast);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .form-input::placeholder {
          color: var(--color-text-muted);
        }

        /* Address Type Options */
        .address-type-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .address-type-option {
          position: relative;
          cursor: pointer;
        }

        .address-type-option input[type="radio"] {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .address-type-option__content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-3);
          border: var(--border-thin);
          border-radius: var(--radius-md);
          background: var(--color-bg-primary);
          transition: all var(--transition-fast);
        }

        .address-type-option:hover .address-type-option__content {
          border-color: var(--color-primary);
          background: var(--color-bg-secondary);
        }

        .address-type-option--active .address-type-option__content {
          border-color: var(--color-primary);
          background: var(--color-primary);
          color: var(--color-text-inverse);
        }

        .address-type-option__content svg {
          color: var(--color-text-secondary);
          transition: color var(--transition-fast);
        }

        .address-type-option--active .address-type-option__content svg {
          color: var(--color-text-inverse);
        }

        .address-type-option__content span {
          font-weight: var(--font-medium);
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        /* Form Checkbox */
        .form-checkbox {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .form-checkbox:hover {
          background: rgba(201, 169, 110, 0.08);
        }

        .form-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--color-primary);
        }

        .form-checkbox span {
          font-weight: var(--font-medium);
          font-size: var(--text-sm);
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          gap: var(--space-3);
          padding-top: var(--space-6);
          border-top: var(--border-thin);
        }

        .form-actions .btn {
          flex: 1;
        }

        /* Spinner Animation */
        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Danger Button Variant */
        .btn--danger {
          background-color: transparent;
          color: var(--color-error);
          border-color: var(--color-error);
        }

        .btn--danger:hover {
          background-color: var(--color-error);
          color: var(--color-text-inverse);
        }

        /* ============================================
           RESPONSIVE DESIGN
           ============================================ */

        @media (max-width: 1024px) {
          .addresses-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            padding: var(--space-6);
            gap: var(--space-4);
          }

          .page-header .btn {
            width: 100%;
          }

          .addresses-list {
            padding: var(--space-6);
          }

          .addresses-grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }

          .address-card {
            padding: var(--space-5);
          }

          .address-form {
            padding: var(--space-6);
          }

          .address-form__header {
            flex-direction: column;
            gap: var(--space-4);
          }

          .address-form__header .btn {
            width: 100%;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .address-type-options {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .form-actions .btn {
            width: 100%;
          }

          .empty-state {
            padding: var(--space-12) var(--space-6);
          }

          .empty-state__icon {
            width: 100px;
            height: 100px;
          }
        }

        @media (max-width: 480px) {
          .page-header {
            padding: var(--space-5);
          }

          .page-header__icon {
            width: 48px;
            height: 48px;
          }

          .page-header__title {
            font-size: var(--text-xl);
          }

          .addresses-list {
            padding: var(--space-4);
          }

          .address-card {
            padding: var(--space-4);
          }

          .address-form {
            padding: var(--space-5);
          }

          .form-section {
            margin-bottom: var(--space-6);
          }

          .empty-state {
            padding: var(--space-10) var(--space-4);
          }

          .empty-state__icon {
            width: 80px;
            height: 80px;
            margin-bottom: var(--space-6);
          }

          .empty-state__title {
            font-size: var(--text-xl);
          }

          .empty-state__text {
            font-size: var(--text-sm);
          }
        }
      `}</style>
    </>
  );
}

function AddressCard({ address, onEdit, onDelete, onSetDefault, getIcon, isDeleting }) {
  return (
    <div className={`address-card ${address.is_default ? 'address-card--default' : ''}`}>
      {/* Header */}
      <div className="address-card__header">
        <div className="address-card__type">
          {getIcon(address.address_type)}
          <span>
            {address.address_type.charAt(0).toUpperCase() +
              address.address_type.slice(1)}
          </span>
        </div>
        {address.is_default && (
          <span className="badge badge--success">
            <Star size={12} fill="currentColor" />
            Default
          </span>
        )}
      </div>

      {/* Content */}
      <div className="address-card__body">
        <h3 className="address-card__name">{address.full_name}</h3>
        <div className="address-card__details">
          <p className="address-card__text">
            {address.address_line1}
            {address.address_line2 && `, ${address.address_line2}`}
          </p>
          {address.landmark && (
            <p className="address-card__text address-card__landmark">
              <MapPin size={14} />
              Near {address.landmark}
            </p>
          )}
          <p className="address-card__text">
            {address.city}, {address.state} - {address.pincode}
          </p>
          <p className="address-card__text address-card__phone">
            <Phone size={14} />
            {address.phone}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="address-card__actions">
        {!address.is_default && (
          <button
            onClick={onSetDefault}
            className="btn btn--secondary btn--sm btn--full"
          >
            <Star size={14} />
            Set Default
          </button>
        )}
        <button
          onClick={onEdit}
          className="btn btn--secondary btn--sm btn--full"
        >
          <Edit2 size={14} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn btn--danger btn--sm btn--full"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader size={14} className="spinner" />
          ) : (
            <Trash2 size={14} />
          )}
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

function AddressForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitting,
  isEditing,
}) {
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);

    try {
      // Get user's coordinates with high accuracy
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('Coordinates:', latitude, longitude);

      // Use Nominatim with zoom level 18 for most detailed address
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'StryngClothing/1.0',
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch address from server');
      }

      const data = await response.json();
      console.log('Geocoding response:', data);

      if (!data.address) {
        throw new Error('No address found for this location');
      }

      const address = data.address;

      // Extract detailed address components with fallbacks
      const houseNumber = address.house_number || '';
      const building = address.building || '';
      const road = address.road || address.street || address.pedestrian || '';
      const suburb = address.suburb || address.neighbourhood || address.quarter || '';
      const village = address.village || '';
      const town = address.town || '';
      const city = address.city || address.municipality || town || village || '';
      const county = address.county || '';
      const state = address.state || address.state_district || address.region || '';
      const pincode = address.postcode || '';
      
      // Landmarks and nearby places
      const amenity = address.amenity || '';
      const shop = address.shop || '';
      const commercial = address.commercial || '';
      const residential = address.residential || '';

      // Build comprehensive address line 1
      let addressLine1 = '';
      if (houseNumber) addressLine1 += houseNumber;
      if (building) addressLine1 += (addressLine1 ? ', ' : '') + building;
      if (road) addressLine1 += (addressLine1 ? ', ' : '') + road;
      
      // If address line 1 is empty, use display name parts
      if (!addressLine1 && data.display_name) {
        const parts = data.display_name.split(',');
        addressLine1 = parts[0]?.trim() || '';
      }

      // Build address line 2 with more details
      let addressLine2 = '';
      if (suburb) addressLine2 = suburb;
      if (residential && !addressLine2) addressLine2 = residential;
      if (commercial && !addressLine2) addressLine2 = commercial;

      // Build landmark from available data
      let landmark = '';
      if (amenity) landmark = amenity;
      else if (shop) landmark = shop;
      else if (building && building !== addressLine1) landmark = building;

      // Validate that we have minimum required data
      if (!addressLine1 && !road) {
        throw new Error('Could not determine street address. Please enter manually.');
      }

      if (!city) {
        throw new Error('Could not determine city. Please enter manually.');
      }

      if (!state) {
        throw new Error('Could not determine state. Please enter manually.');
      }

      // Auto-fill the form with fetched data
      setFormData((prev) => ({
        ...prev,
        address_line1: addressLine1 || prev.address_line1,
        address_line2: addressLine2 || prev.address_line2,
        city: city || prev.city,
        state: state || prev.state,
        pincode: pincode || prev.pincode,
        landmark: landmark || prev.landmark,
      }));

      // Show success message with fetched address
      const fetchedAddress = `${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${state}${pincode ? ' - ' + pincode : ''}`;
      alert(`Location fetched successfully!\n\nAddress: ${fetchedAddress}\n\nPlease verify and edit if needed.`);
      
    } catch (error) {
      console.error('Error fetching location:', error);
      
      // Provide specific error messages
      if (error.code === 1) {
        alert('❌ Location Access Denied\n\nPlease enable location permissions in your browser settings and try again.');
      } else if (error.code === 2) {
        alert('❌ Location Unavailable\n\nYour device location is currently unavailable. Please check your GPS/location settings.');
      } else if (error.code === 3) {
        alert('❌ Request Timeout\n\nLocation request took too long. Please try again or enter address manually.');
      } else if (error.message) {
        alert(`❌ Error: ${error.message}\n\nPlease enter your address manually.`);
      } else {
        alert('❌ Failed to fetch location\n\nPlease enter your address manually.');
      }
    } finally {
      setFetchingLocation(false);
    }
  };

  return (
    <div className="address-form">
      <div className="address-form__header">
        <div>
          <h2 className="address-form__title">{isEditing ? 'Edit Address' : 'Add New Address'}</h2>
          <p className="address-form__subtitle">Fill in the details below to {isEditing ? 'update' : 'add'} your address</p>
        </div>
        <button
          type="button"
          onClick={fetchCurrentLocation}
          className="btn btn--secondary"
          disabled={fetchingLocation}
        >
          {fetchingLocation ? (
            <>
              <Loader size={18} className="spinner" />
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <Navigation size={18} />
              <span>Use My Location</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={onSubmit} className="form">
        {/* Location Info Banner */}
        <div className="info-banner">
          <Navigation size={16} />
          <span>
            Click "Use My Location" to auto-fill address details based on your current location
          </span>
        </div>

        <div className="form-section">
          <h3 className="form-section__title">Contact Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Full Name <span className="form-required">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone Number <span className="form-required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="10-digit mobile number"
                pattern="[0-9]{10,15}"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section__title">Address Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Pincode <span className="form-required">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className="form-input"
                placeholder="6-digit pincode"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                City <span className="form-required">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter city"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                State <span className="form-required">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter state"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Address Line 1 <span className="form-required">*</span>
            </label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="form-input"
              placeholder="House No., Building Name, Street"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="form-input"
              placeholder="Road Name, Area, Colony (Optional)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Landmark</label>
            <input
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              className="form-input"
              placeholder="Nearby landmark for easy location (Optional)"
            />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section__title">Address Type</h3>
          <div className="address-type-options">
            <label className={`address-type-option ${formData.address_type === 'home' ? 'address-type-option--active' : ''}`}>
              <input
                type="radio"
                name="address_type"
                value="home"
                checked={formData.address_type === 'home'}
                onChange={handleChange}
              />
              <div className="address-type-option__content">
                <Home size={20} />
                <span>Home</span>
              </div>
            </label>

            <label className={`address-type-option ${formData.address_type === 'work' ? 'address-type-option--active' : ''}`}>
              <input
                type="radio"
                name="address_type"
                value="work"
                checked={formData.address_type === 'work'}
                onChange={handleChange}
              />
              <div className="address-type-option__content">
                <Briefcase size={20} />
                <span>Work</span>
              </div>
            </label>

            <label className={`address-type-option ${formData.address_type === 'other' ? 'address-type-option--active' : ''}`}>
              <input
                type="radio"
                name="address_type"
                value="other"
                checked={formData.address_type === 'other'}
                onChange={handleChange}
              />
              <div className="address-type-option__content">
                <MapPinned size={20} />
                <span>Other</span>
              </div>
            </label>
          </div>

          <label className="form-checkbox">
            <input
              type="checkbox"
              name="is_default"
              checked={formData.is_default}
              onChange={handleChange}
            />
            <span>Set as default delivery address</span>
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary btn--lg"
            disabled={submitting}
          >
            <X size={18} />
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader size={18} className="spinner" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                {isEditing ? 'Update Address' : 'Save Address'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

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

      <div className="modern-addresses-page">
        <div className="addresses-container">
          {/* Header */}
          <div className="addresses-header">
            <div className="header-content">
              <div className="header-icon">
                <MapPin size={28} />
              </div>
              <div className="header-text">
                <h1>My Addresses</h1>
                <p>Manage your delivery addresses</p>
              </div>
            </div>
            {!showForm && (
              <button onClick={handleAddNew} className="add-address-button">
                <Plus size={20} />
                <span>Add New</span>
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
            <div className="addresses-content">
              {addresses.length === 0 ? (
                <div className="addresses-empty">
                  <div className="empty-illustration">
                    <MapPin size={64} />
                  </div>
                  <h2>No addresses saved</h2>
                  <p>Add your first delivery address to get started with faster checkout</p>
                  <button onClick={handleAddNew} className="empty-action-button">
                    <Plus size={20} />
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
    </>
  );
}

function AddressCard({ address, onEdit, onDelete, onSetDefault, getIcon, isDeleting }) {
  return (
    <div className={`modern-address-card ${address.is_default ? 'is-default' : ''}`}>
      {/* Header */}
      <div className="address-card-header">
        <div className="address-type-badge">
          {getIcon(address.address_type)}
          <span>
            {address.address_type.charAt(0).toUpperCase() +
              address.address_type.slice(1)}
          </span>
        </div>
        {address.is_default && (
          <div className="default-star-badge">
            <Star size={14} fill="currentColor" />
            <span>Default</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="address-card-body">
        <h3 className="address-name">{address.full_name}</h3>
        <div className="address-details">
          <p className="address-street">
            {address.address_line1}
            {address.address_line2 && `, ${address.address_line2}`}
          </p>
          {address.landmark && (
            <p className="address-landmark">
              <MapPin size={14} />
              Near {address.landmark}
            </p>
          )}
          <p className="address-location">
            {address.city}, {address.state} - {address.pincode}
          </p>
          <p className="address-phone">
            <Phone size={14} />
            {address.phone}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="address-card-actions">
        {!address.is_default && (
          <button
            onClick={onSetDefault}
            className="action-button set-default-button"
            title="Set as default"
          >
            <Star size={16} />
            <span>Set Default</span>
          </button>
        )}
        <button
          onClick={onEdit}
          className="action-button edit-button"
          title="Edit address"
        >
          <Edit2 size={16} />
          <span>Edit</span>
        </button>
        <button
          onClick={onDelete}
          className="action-button delete-button"
          title="Delete address"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader size={16} className="button-spinner" />
          ) : (
            <Trash2 size={16} />
          )}
          <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
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
    <div className="address-form-container">
      <div className="form-header">
        <div className="form-header-content">
          <h2>{isEditing ? 'Edit Address' : 'Add New Address'}</h2>
          <p>Fill in the details below to {isEditing ? 'update' : 'add'} your address</p>
        </div>
        <button
          type="button"
          onClick={fetchCurrentLocation}
          className="location-button"
          disabled={fetchingLocation}
          title="Use my current location"
        >
          {fetchingLocation ? (
            <>
              <Loader size={18} className="button-spinner" />
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

      <form onSubmit={onSubmit} className="modern-address-form">
        {/* Location Info Banner */}
        <div className="location-info-banner">
          <Navigation size={16} />
          <span>
            Click "Use My Location" to auto-fill address details based on your current location
          </span>
        </div>

        <div className="form-section">
          <h3 className="section-title">Contact Information</h3>
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="field-input"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="field-input"
                placeholder="10-digit mobile number"
                pattern="[0-9]{10,15}"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">Address Details</h3>
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">
                Pincode <span className="required">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className="field-input"
                placeholder="6-digit pincode"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                City <span className="required">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="field-input"
                placeholder="Enter city"
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                State <span className="required">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="field-input"
                placeholder="Enter state"
                required
              />
            </div>
          </div>

          <div className="form-field full-width">
            <label className="field-label">
              Address Line 1 <span className="required">*</span>
            </label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="field-input"
              placeholder="House No., Building Name, Street"
              required
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="field-input"
              placeholder="Road Name, Area, Colony (Optional)"
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Landmark</label>
            <input
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              className="field-input"
              placeholder="Nearby landmark for easy location (Optional)"
            />
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">Address Type</h3>
          <div className="address-type-selector">
            <label className={`type-option ${formData.address_type === 'home' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="address_type"
                value="home"
                checked={formData.address_type === 'home'}
                onChange={handleChange}
              />
              <div className="type-content">
                <Home size={20} />
                <span>Home</span>
              </div>
            </label>

            <label className={`type-option ${formData.address_type === 'work' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="address_type"
                value="work"
                checked={formData.address_type === 'work'}
                onChange={handleChange}
              />
              <div className="type-content">
                <Briefcase size={20} />
                <span>Work</span>
              </div>
            </label>

            <label className={`type-option ${formData.address_type === 'other' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="address_type"
                value="other"
                checked={formData.address_type === 'other'}
                onChange={handleChange}
              />
              <div className="type-content">
                <MapPinned size={20} />
                <span>Other</span>
              </div>
            </label>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="is_default"
              checked={formData.is_default}
              onChange={handleChange}
            />
            <span className="checkbox-label">
              <Check size={16} className="checkbox-icon" />
              Set as default delivery address
            </span>
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button"
            disabled={submitting}
          >
            <X size={18} />
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader size={18} className="button-spinner" />
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

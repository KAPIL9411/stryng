import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Phone, Home, Briefcase, MapPinned } from 'lucide-react';
import useStore from '../store/useStore';
import SEO from '../components/SEO';
import {
    getUserAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from '../api/addresses.api';

export default function Addresses() {
    const { showToast } = useStore();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [submitting, setSubmitting] = useState(false);

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
        is_default: false
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        setLoading(true);
        const response = await getUserAddresses();
        if (response.success) {
            setAddresses(response.data);
        } else {
            showToast('Failed to load addresses', 'error');
        }
        setLoading(false);
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
            is_default: addresses.length === 0
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
                    editingAddress ? 'Address updated successfully' : 'Address added successfully',
                    'success'
                );
                setShowForm(false);
                fetchAddresses();
            } else {
                showToast(response.error || 'Failed to save address', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (addressId) => {
        if (!confirm('Are you sure you want to delete this address?')) return;

        const response = await deleteAddress(addressId);
        if (response.success) {
            showToast('Address deleted successfully', 'success');
            fetchAddresses();
        } else {
            showToast('Failed to delete address', 'error');
        }
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
                return <Home size={18} />;
            case 'work':
                return <Briefcase size={18} />;
            default:
                return <MapPinned size={18} />;
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
                        Loading addresses...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <SEO 
                title="My Addresses - Stryng Clothing"
                description="Manage your delivery addresses"
            />
            
            <div className="page-container">
                <div className="container" style={{ padding: '3rem 0' }}>
                    <div className="page-header">
                        <h1 className="page-title">My Addresses</h1>
                        {!showForm && (
                            <button onClick={handleAddNew} className="btn btn--primary">
                                <Plus size={18} /> Add New Address
                            </button>
                        )}
                    </div>

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
                        <div className="addresses-grid">
                            {addresses.length === 0 ? (
                                <div className="empty-state">
                                    <MapPin size={48} />
                                    <h3>No addresses saved</h3>
                                    <p>Add your first delivery address to get started</p>
                                    <button onClick={handleAddNew} className="btn btn--primary">
                                        <Plus size={18} /> Add Address
                                    </button>
                                </div>
                            ) : (
                                addresses.map((address) => (
                                    <AddressCard
                                        key={address.id}
                                        address={address}
                                        onEdit={() => handleEdit(address)}
                                        onDelete={() => handleDelete(address.id)}
                                        onSetDefault={() => handleSetDefault(address.id)}
                                        getIcon={getAddressIcon}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function AddressCard({ address, onEdit, onDelete, onSetDefault, getIcon }) {
    return (
        <div className={`address-card ${address.is_default ? 'address-card--default' : ''}`}>
            {address.is_default && (
                <div className="address-card__badge">Default</div>
            )}
            
            <div className="address-card__header">
                <div className="address-card__type">
                    {getIcon(address.address_type)}
                    <span>{address.address_type.charAt(0).toUpperCase() + address.address_type.slice(1)}</span>
                </div>
                <div className="address-card__actions">
                    <button onClick={onEdit} className="btn-icon" title="Edit">
                        <Edit size={16} />
                    </button>
                    <button onClick={onDelete} className="btn-icon btn-icon--delete" title="Delete">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="address-card__content">
                <h4 className="address-card__name">{address.full_name}</h4>
                <p className="address-card__address">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                </p>
                {address.landmark && (
                    <p className="address-card__landmark">Landmark: {address.landmark}</p>
                )}
                <p className="address-card__location">
                    {address.city}, {address.state} - {address.pincode}
                </p>
                <p className="address-card__phone">
                    <Phone size={14} /> {address.phone}
                </p>
            </div>

            {!address.is_default && (
                <button onClick={onSetDefault} className="address-card__set-default">
                    Set as Default
                </button>
            )}
        </div>
    );
}

function AddressForm({ formData, setFormData, onSubmit, onCancel, submitting, isEditing }) {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <form onSubmit={onSubmit} className="address-form">
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-input"
                        pattern="[0-9]{10,15}"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        className="form-input"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group form-group--full">
                    <label className="form-label">Address Line 1 *</label>
                    <input
                        type="text"
                        name="address_line1"
                        value={formData.address_line1}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="House No., Building Name"
                        required
                    />
                </div>

                <div className="form-group form-group--full">
                    <label className="form-label">Address Line 2</label>
                    <input
                        type="text"
                        name="address_line2"
                        value={formData.address_line2}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Road Name, Area, Colony"
                    />
                </div>

                <div className="form-group form-group--full">
                    <label className="form-label">Landmark</label>
                    <input
                        type="text"
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Near..."
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Address Type *</label>
                    <select
                        name="address_type"
                        value={formData.address_type}
                        onChange={handleChange}
                        className="form-input"
                        required
                    >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="is_default"
                            checked={formData.is_default}
                            onChange={handleChange}
                        />
                        <span>Set as default address</span>
                    </label>
                </div>
            </div>

            <div className="form-actions">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn--secondary"
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={submitting}
                >
                    {submitting ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
                </button>
            </div>
        </form>
    );
}

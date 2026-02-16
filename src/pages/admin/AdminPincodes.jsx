import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  Download,
  Search,
} from 'lucide-react';
import useStore from '../../store/useStore';
import {
  getAllServiceablePincodes,
  addServiceablePincode,
  updateServiceablePincode,
  deleteServiceablePincode,
  bulkUploadPincodes,
} from '../../api/pincodes.api';

export default function AdminPincodes() {
  const [pincodes, setPincodes] = useState([]);
  const [filteredPincodes, setFilteredPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    pincode: '',
    city: '',
    state: '',
    is_cod_available: true,
    estimated_delivery_days: 5,
    is_active: true,
  });

  useEffect(() => {
    fetchPincodes();
  }, []);

  useEffect(() => {
    filterPincodes();
  }, [searchTerm, pincodes]);

  const fetchPincodes = async () => {
    setLoading(true);
    const response = await getAllServiceablePincodes();
    if (response.success) {
      setPincodes(response.data);
    }
    setLoading(false);
  };

  const filterPincodes = () => {
    if (!searchTerm) {
      setFilteredPincodes(pincodes);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = pincodes.filter(
      (p) =>
        p.pincode.includes(term) ||
        p.city.toLowerCase().includes(term) ||
        p.state.toLowerCase().includes(term)
    );
    setFilteredPincodes(filtered);
  };

  const handleAddNew = () => {
    setFormData({
      pincode: '',
      city: '',
      state: '',
      is_cod_available: true,
      estimated_delivery_days: 5,
      is_active: true,
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleEdit = (pincode) => {
    setFormData(pincode);
    setEditingId(pincode.id);
    setIsEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let response;
      if (editingId) {
        response = await updateServiceablePincode(editingId, formData);
      } else {
        response = await addServiceablePincode(formData);
      }

      if (response.success) {
        showToast(
          editingId
            ? 'Pincode updated successfully'
            : 'Pincode added successfully',
          'success'
        );
        setIsEditing(false);
        fetchPincodes();
      } else {
        showToast(response.error || 'Failed to save pincode', 'error');
      }
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this pincode?')) return;

    const response = await deleteServiceablePincode(id);
    if (response.success) {
      showToast('Pincode deleted successfully', 'success');
      fetchPincodes();
    } else {
      showToast('Failed to delete pincode', 'error');
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const pincodesArray = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const [pincode, city, state, is_cod, delivery_days] = line.split(',');

          if (pincode && city && state) {
            pincodesArray.push({
              pincode: pincode.trim(),
              city: city.trim(),
              state: state.trim(),
              is_cod_available: is_cod?.trim().toLowerCase() !== 'false',
              estimated_delivery_days: parseInt(delivery_days?.trim()) || 5,
              is_active: true,
            });
          }
        }

        if (pincodesArray.length === 0) {
          showToast('No valid data found in CSV', 'error');
          return;
        }

        const response = await bulkUploadPincodes(pincodesArray);
        if (response.success) {
          showToast(
            `Successfully uploaded ${response.count} pincodes`,
            'success'
          );
          fetchPincodes();
        } else {
          showToast('Failed to upload pincodes', 'error');
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        showToast('Error parsing CSV file', 'error');
      }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleExportCSV = () => {
    const headers = [
      'pincode',
      'city',
      'state',
      'is_cod_available',
      'estimated_delivery_days',
      'is_active',
    ];
    const csvContent = [
      headers.join(','),
      ...pincodes.map((p) =>
        [
          p.pincode,
          p.city,
          p.state,
          p.is_cod_available,
          p.estimated_delivery_days,
          p.is_active,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serviceable_pincodes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#666' }}>Loading pincodes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Serviceable Pincodes</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Manage delivery pincodes ({pincodes.length} total)
            </p>
          </div>
          {!isEditing && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <label
                className="btn btn--secondary"
                style={{ cursor: 'pointer' }}
              >
                <Upload size={18} /> Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={handleExportCSV} className="btn btn--secondary">
                <Download size={18} /> Export CSV
              </button>
              <button onClick={handleAddNew} className="btn btn--primary">
                <Plus size={18} /> Add Pincode
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="panel">
            <div className="flex flex--between mb-4">
              <h2>{editingId ? 'Edit Pincode' : 'New Pincode'}</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn--ghost btn--sm"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label className="form-label">Pincode *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  disabled={!!editingId}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Delivery Days *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.estimated_delivery_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_delivery_days: parseInt(e.target.value),
                    })
                  }
                  min={1}
                  max={30}
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_cod_available}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_cod_available: e.target.checked,
                      })
                    }
                  />
                  <span>COD Available</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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
                  <Save size={18} />
                  {submitting ? 'Saving...' : 'Save Pincode'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="panel" style={{ marginBottom: '1.5rem' }}>
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search by pincode, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="panel">
              {filteredPincodes.length === 0 ? (
                <div className="text-center p-8 text-muted">
                  {searchTerm
                    ? 'No pincodes found matching your search'
                    : 'No pincodes added yet'}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pincode</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Delivery Days</th>
                        <th>COD</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPincodes.map((pincode) => (
                        <tr key={pincode.id}>
                          <td>
                            <strong>{pincode.pincode}</strong>
                          </td>
                          <td>{pincode.city}</td>
                          <td>{pincode.state}</td>
                          <td>{pincode.estimated_delivery_days} days</td>
                          <td>
                            <span
                              className={`badge ${pincode.is_cod_available ? 'badge--success' : 'badge--secondary'}`}
                            >
                              {pincode.is_cod_available ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${pincode.is_active ? 'badge--success' : 'badge--warning'}`}
                            >
                              {pincode.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(pincode)}
                                className="btn-icon btn-icon--edit"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(pincode.id)}
                                className="btn-icon btn-icon--delete"
                                title="Delete"
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
          </>
        )}
      </div>
    </div>
  );
}

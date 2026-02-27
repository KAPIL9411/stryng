import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import useStore from '../../store/useStore';
import ImageUpload from '../../components/admin/ImageUpload';
import * as bannersAPI from '../../api/banners.api';

export default function AdminBanners() {
  const { showToast } = useStore();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    cta_text: 'Shop Now',
    cta_link: '/products',
    sort_order: 0,
    active: true,
  });

  // Fetch banners on mount
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await bannersAPI.fetchAllBanners();
      setBanners(data);
    } catch (error) {
      console.error('Error fetching banners:', error);
      showToast('Failed to load banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      cta_text: 'Shop Now',
      cta_link: '/products',
      sort_order: banners.length + 1,
      active: true,
    });
    setImages([]);
    setEditingId(null);
    setIsEditing(true);
  };

  const handleEdit = (banner) => {
    setFormData({
      title: banner.title || '',
      description: banner.description || '',
      image_url: banner.image_url,
      cta_text: banner.cta_text || 'Shop Now',
      cta_link: banner.cta_link,
      sort_order: banner.sort_order,
      active: banner.active !== false,
    });
    setImages([banner.image_url]);
    setEditingId(banner.id);
    setIsEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      showToast('Please upload an image', 'error');
      return;
    }

    if (!formData.cta_link) {
      showToast('Please provide a link URL', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title || '',
        description: formData.description || '',
        image_url: images[0],
        cta_text: formData.cta_text || 'Shop Now',
        cta_link: formData.cta_link,
        sort_order: formData.sort_order || 0,
        active: formData.active !== false,
      };

      if (editingId) {
        await bannersAPI.updateBanner(editingId, payload);
        showToast('Banner updated successfully', 'success');
      } else {
        await bannersAPI.createBanner(payload);
        showToast('Banner created successfully', 'success');
      }

      // Refetch banners
      await fetchBanners();
      
      // Reset form
      setIsEditing(false);
      setImages([]);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        cta_text: 'Shop Now',
        cta_link: '/products',
        sort_order: 0,
        active: true,
      });
    } catch (error) {
      console.error('Error saving banner:', error);
      showToast(`Failed to save banner: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      await bannersAPI.deleteBanner(id);
      showToast('Banner deleted successfully', 'success');
      await fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      showToast(`Failed to delete banner: ${error.message}`, 'error');
    }
  };

  const moveBanner = async (index, direction) => {
    try {
      const newBanners = [...banners];
      const [movedBanner] = newBanners.splice(index, 1);
      newBanners.splice(index + direction, 0, movedBanner);

      // Update all sort orders
      for (let i = 0; i < newBanners.length; i++) {
        if (newBanners[i].sort_order !== i + 1) {
          await bannersAPI.updateBanner(newBanners[i].id, { sort_order: i + 1 });
        }
      }

      showToast('Banner order updated', 'success');
      await fetchBanners();
    } catch (error) {
      console.error('Error reordering banners:', error);
      showToast('Failed to reorder banners', 'error');
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#666' }}>Loading banners...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Hero Banners</h1>
          {!isEditing && (
            <button onClick={handleAddNew} className="btn btn--primary">
              <Plus size={18} /> Add New Banner
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="panel">
            <div className="flex flex--between mb-4">
              <h2>{editingId ? 'Edit Banner' : 'New Banner'}</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn--ghost btn--sm"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group form-group--full">
                <label>Banner Image *</label>
                <ImageUpload
                  images={images}
                  onChange={setImages}
                  maxImages={1}
                />
                <small style={{ color: '#666', fontSize: '0.8125rem', display: 'block', marginTop: '0.5rem' }}>
                  Recommended size: 600x800px
                </small>
              </div>

              <div className="form-group">
                <label>Link URL *</label>
                <input
                  className="form-input"
                  value={formData.cta_link}
                  onChange={(e) =>
                    setFormData({ ...formData, cta_link: e.target.value })
                  }
                  placeholder="/products"
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                  />
                  <span>Active (show on website)</span>
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
                  {submitting ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="panel">
            {banners.length === 0 ? (
              <div className="text-center p-8 text-muted">
                No banners found. Create one!
              </div>
            ) : (
              <div className="banner-list">
                {banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className="banner-item flex flex--between items-center p-4 border-b"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={banner.image_url}
                        alt={`Banner ${index + 1}`}
                        className="w-16 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="text-sm" style={{ color: '#666' }}>
                          Links to: <strong>{banner.cta_link}</strong>
                        </p>
                        {!banner.active && (
                          <span className="badge badge--warning text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => index > 0 && moveBanner(index, -1)}
                        className="btn-icon"
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() =>
                          index < banners.length - 1 && moveBanner(index, 1)
                        }
                        className="btn-icon"
                        disabled={index === banners.length - 1}
                        title="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(banner)}
                        className="btn-icon btn-icon--edit"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="btn-icon btn-icon--delete"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .banner-item:last-child { border-bottom: none; }
        .w-16 { width: 4rem; }
        .h-10 { height: 2.5rem; }
        .object-cover { object-fit: cover; }
        .rounded { border-radius: 0.25rem; }
        .p-4 { padding: 1rem; }
        .border-b { border-bottom: 1px solid var(--color-border); }
        .text-center { text-align: center; }
        .p-8 { padding: 2rem; }
      `}</style>
    </div>
  );
}

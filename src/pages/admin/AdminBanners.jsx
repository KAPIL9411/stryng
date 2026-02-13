import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import useStore from '../../store/useStore';
import ImageUpload from '../../components/admin/ImageUpload';

export default function AdminBanners() {
    const { banners, fetchBanners, createBanner, updateBanner, deleteBanner } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        cta_text: 'Shop Now',
        cta_link: '/products',
        sort_order: 0,
        active: true
    });
    const [images, setImages] = useState([]); // For ImageUpload component

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleEdit = (banner) => {
        setFormData(banner);
        setImages([banner.image_url]);
        setEditingId(banner.id);
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setFormData({
            title: '',
            description: '',
            image_url: '',
            cta_text: 'Shop Now',
            cta_link: '/products',
            sort_order: banners.length + 1,
            active: true
        });
        setImages([]);
        setEditingId(null);
        setIsEditing(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (images.length === 0) {
            alert('Please upload an image');
            return;
        }

        const payload = { ...formData, image_url: images[0] };

        if (editingId) {
            await updateBanner(editingId, payload);
        } else {
            await createBanner(payload);
        }
        setIsEditing(false);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this banner?')) {
            await deleteBanner(id);
        }
    };

    const moveBanner = async (index, direction) => {
        const newBanners = [...banners];
        const [movedBanner] = newBanners.splice(index, 1);
        newBanners.splice(index + direction, 0, movedBanner);

        // Update all sort orders
        for (let i = 0; i < newBanners.length; i++) {
            if (newBanners[i].sort_order !== i + 1) {
                await updateBanner(newBanners[i].id, { sort_order: i + 1 });
            }
        }
    };

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
                            <button onClick={() => setIsEditing(false)} className="btn btn--ghost btn--sm"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="form-grid">
                            <div className="form-group form-group--full">
                                <label>Banner Image *</label>
                                <ImageUpload images={images} onChange={setImages} maxImages={1} />
                            </div>

                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    className="form-input"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    className="form-input"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>CTA Text</label>
                                <input
                                    className="form-input"
                                    value={formData.cta_text}
                                    onChange={e => setFormData({ ...formData, cta_text: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Link URL</label>
                                <input
                                    className="form-input"
                                    value={formData.cta_link}
                                    onChange={e => setFormData({ ...formData, cta_link: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                    <span>Active</span>
                                </label>
                            </div>

                            <div className="form-actions">
                                <button type="button" onClick={() => setIsEditing(false)} className="btn btn--secondary">Cancel</button>
                                <button type="submit" className="btn btn--primary"><Save size={18} /> Save Banner</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="panel">
                        {banners.length === 0 ? (
                            <div className="text-center p-8 text-muted">No banners found. Create one!</div>
                        ) : (
                            <div className="banner-list">
                                {banners.map((banner, index) => (
                                    <div key={banner.id} className="banner-item flex flex--between items-center p-4 border-b">
                                        <div className="flex items-center gap-4">
                                            <img src={banner.image_url} alt={banner.title} className="w-16 h-10 object-cover rounded" />
                                            <div>
                                                <h3 className="font-semibold">{banner.title}</h3>
                                                <p className="text-sm text-muted">{banner.description}</p>
                                                {!banner.active && <span className="badge badge--warning text-xs">Inactive</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => index > 0 && moveBanner(index, -1)}
                                                className="btn-icon" disabled={index === 0}
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => index < banners.length - 1 && moveBanner(index, 1)}
                                                className="btn-icon" disabled={index === banners.length - 1}
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(banner)} className="btn-icon btn-icon--edit"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(banner.id)} className="btn-icon btn-icon--delete"><Trash2 size={16} /></button>
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

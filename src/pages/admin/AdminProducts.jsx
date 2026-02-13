import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import useStore from '../../store/useStore';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function AdminProducts() {
    const { products, deleteProduct } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            await deleteProduct(id);
        }
    };

    const categories = ['all', 'shirts', 't-shirts', 'trousers', 'jackets', 'shorts', 'polo'];

    return (
        <div className="admin-page">
            <div className="admin-container">
                <div className="admin-header">
                    <h1>Products</h1>
                    <Link to="/admin/products/new" className="btn btn--primary">
                        <Plus size={18} /> Add New Product
                    </Link>
                </div>

                {/* Filters */}
                <div className="admin-filters">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or slug..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-group">
                        <Filter size={18} className="filter-icon" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="filter-select"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Products Table */}
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        <p style={{ marginBottom: '1rem', color: '#666' }}>No products found.</p>
                                        {products.length === 0 && (
                                            <button
                                                onClick={() => useStore.getState().seedProducts()}
                                                className="btn btn--secondary btn--sm"
                                            >
                                                🌱 Load Sample Data
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="product-thumbnail"
                                            />
                                        </td>
                                        <td>
                                            <div className="product-info">
                                                <strong>{product.name}</strong>
                                                <span className="product-slug">{product.slug}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="category-badge">{product.category}</span>
                                        </td>
                                        <td>
                                            <div className="price-info">
                                                <strong>{formatPrice(product.price)}</strong>
                                                {product.originalPrice > product.price && (
                                                    <span className="original-price">
                                                        {formatPrice(product.originalPrice || product.original_price)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="stock-badge stock-badge--in-stock">
                                                In Stock
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <Link
                                                    to={`/admin/products/${product.id}/edit`}
                                                    className="btn-icon btn-icon--edit"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="btn-icon btn-icon--delete"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="admin-footer">
                    <p>Showing {filteredProducts.length} of {products.length} products</p>
                </div>
            </div>
        </div>
    );
}

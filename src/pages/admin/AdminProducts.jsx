import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Package,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { useAllProducts } from '../../hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { getStockStatus } from '../../lib/inventory';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function AdminProducts() {
  const { deleteProduct, showToast } = useStore();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading, error, refetch } = useAllProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [isSeeding, setIsSeeding] = useState(false);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' || product.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'in_stock') {
      // If stock is undefined, treat as in stock (not tracked)
      matchesStock =
        product.stock === undefined ||
        product.stock > (product.lowStockThreshold || 10);
    } else if (stockFilter === 'low_stock') {
      matchesStock =
        product.stock !== undefined &&
        product.stock > 0 &&
        product.stock <= (product.lowStockThreshold || 10);
    } else if (stockFilter === 'out_of_stock') {
      matchesStock = product.stock !== undefined && product.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Calculate stock statistics (only count products with defined stock)
  const trackedProducts = products.filter((p) => p.stock !== undefined);
  const stockStats = {
    total: products.length,
    inStock: products.filter(
      (p) => p.stock === undefined || p.stock > (p.lowStockThreshold || 10)
    ).length,
    lowStock: trackedProducts.filter(
      (p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)
    ).length,
    outOfStock: trackedProducts.filter((p) => p.stock === 0).length,
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteProduct(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      refetch();
    }
  };

  const handleSeedProducts = async () => {
    setIsSeeding(true);
    try {
      await useStore.getState().seedProducts();
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      await refetch();
    } catch (error) {
      console.error('Seeding error:', error);
      showToast('Failed to seed products', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const getStockBadge = (product) => {
    // Don't convert undefined to 0 - preserve undefined for proper handling
    const stock = product.stock;
    const threshold = product.lowStockThreshold || 10;
    const status = getStockStatus(stock, threshold);

    return (
      <span
        className="stock-badge"
        style={{
          backgroundColor: `${status.color}15`,
          color: status.color,
          border: `1px solid ${status.color}40`,
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.8125rem',
          fontWeight: '600',
          display: 'inline-block',
        }}
      >
        {status.label}
      </span>
    );
  };

  const categories = [
    'all',
    'shirts',
    't-shirts',
    'trousers',
    'jackets',
    'shorts',
    'polo',
  ];

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#666' }}>Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ color: '#dc2626', marginBottom: '20px' }}>
              Error loading products: {error.message}
            </p>
            <button onClick={() => refetch()} className="btn btn--primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Products</h1>
          <Link to="/admin/products/new" className="btn btn--primary">
            <Plus size={18} /> Add New Product
          </Link>
        </div>

        {/* Stock Statistics Cards */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}
            >
              <Package size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Products</p>
              <p className="stat-value">{stockStats.total}</p>
            </div>
          </div>

          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}
            >
              <Package size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">In Stock</p>
              <p className="stat-value">{stockStats.inStock}</p>
            </div>
          </div>

          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}
            >
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Low Stock</p>
              <p className="stat-value">{stockStats.lowStock}</p>
            </div>
          </div>

          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: '#dc262615', color: '#dc2626' }}
            >
              <TrendingDown size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Out of Stock</p>
              <p className="stat-value">{stockStats.outOfStock}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, slug, or SKU..."
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
              <option value="all">All Categories</option>
              {categories.slice(1).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name / SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: 'center', padding: '40px' }}
                  >
                    <p style={{ marginBottom: '1rem', color: '#666' }}>
                      No products found.
                    </p>
                    {products.length === 0 && (
                      <button
                        onClick={handleSeedProducts}
                        disabled={isSeeding}
                        className="btn btn--secondary btn--sm"
                        style={{ opacity: isSeeding ? 0.6 : 1 }}
                      >
                        {isSeeding ? '⏳ Loading...' : '🌱 Load Sample Data'}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Image">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="product-thumbnail"
                      />
                    </td>
                    <td data-label="Name / SKU">
                      <div className="product-info">
                        <strong>{product.name}</strong>
                        <span className="product-slug">
                          {product.sku ? `SKU: ${product.sku}` : product.slug}
                        </span>
                      </div>
                    </td>
                    <td data-label="Category">
                      <span className="category-badge">{product.category}</span>
                    </td>
                    <td data-label="Price">
                      <div className="price-info">
                        <strong>{formatPrice(product.price)}</strong>
                        {product.originalPrice > product.price && (
                          <span className="original-price">
                            {formatPrice(
                              product.originalPrice || product.original_price
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Stock">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <strong style={{ fontSize: '1.1rem' }}>
                          {product.stock !== undefined ? product.stock : 'N/A'}
                        </strong>
                        {product.stock !== undefined &&
                          product.stock <=
                            (product.lowStockThreshold || 10) && (
                            <span
                              style={{ fontSize: '0.75rem', color: '#f59e0b' }}
                            >
                              Threshold: {product.lowStockThreshold || 10}
                            </span>
                          )}
                      </div>
                    </td>
                    <td data-label="Status">{getStockBadge(product)}</td>
                    <td data-label="Actions">
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
          <p>
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>
      </div>
    </div>
  );
}

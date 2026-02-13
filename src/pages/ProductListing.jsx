
import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { categories, formatPrice } from '../lib/dummyData';
import useStore from '../store/useStore';

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colorOptions = [
    { name: 'Black', hex: '#0A0A0A' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Navy', hex: '#1B2A4A' },
    { name: 'Brown', hex: '#8B4513' },
    { name: 'Green', hex: '#1B4332' },
    { name: 'Blue', hex: '#4A90D9' },
    { name: 'Beige', hex: '#D4B896' },
    { name: 'Gray', hex: '#808080' },
];

function ProductCard({ product }) {
    return (
        <Link to={`/products/${product.slug}`} className="product-card">
            <div className="product-card__image-wrapper">
                <img src={product.images[0]} alt={product.name} className="product-card__image" loading="lazy" />
                {product.images[1] && (
                    <img src={product.images[1]} alt={product.name} className="product-card__hover-image" loading="lazy" />
                )}
                <div className="product-card__badges">
                    {product.isNew && <span className="badge badge--new">New</span>}
                    {product.isTrending && <span className="badge badge--trending">Trending</span>}
                    {product.discount > 0 && <span className="badge badge--sale">-{product.discount}%</span>}
                </div>
                <div className="product-card__actions">
                    <button className="product-card__action-btn" aria-label="Wishlist" onClick={(e) => e.preventDefault()}>
                        <Heart size={16} />
                    </button>
                    <button className="product-card__action-btn" aria-label="Quick view" onClick={(e) => e.preventDefault()}>
                        <Eye size={16} />
                    </button>
                </div>
                <div className="product-card__quick-add" onClick={(e) => e.preventDefault()}>
                    <ShoppingBag size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Quick Add
                </div>
            </div>
            <div className="product-card__info">
                <p className="product-card__brand">{product.brand}</p>
                <h3 className="product-card__name">{product.name}</h3>
                <div className="product-card__price">
                    <span className="product-card__price--current">{formatPrice(product.price)}</span>
                    {product.originalPrice > product.price && (
                        <>
                            <span className="product-card__price--original">{formatPrice(product.originalPrice)}</span>
                            <span className="product-card__price--discount">({product.discount}% off)</span>
                        </>
                    )}
                </div>
                <div className="product-card__colors">
                    {product.colors.map((c) => (
                        <span key={c.name} className="product-card__color-dot" style={{ backgroundColor: c.hex }} title={c.name} />
                    ))}
                </div>
            </div>
        </Link>
    );
}

function FilterSidebar({ onFilterChange }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [openSections, setOpenSections] = useState({ category: true, price: true, size: true, color: true });

    // Get current filters
    const currentCategories = searchParams.getAll('category');
    const currentSizes = searchParams.getAll('size');
    const currentColors = searchParams.getAll('color');
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    const toggle = (section) => setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

    const updateFilter = (type, value) => {
        const newParams = new URLSearchParams(searchParams);
        const current = newParams.getAll(type);

        if (current.includes(value)) {
            newParams.delete(type);
            current.filter(item => item !== value).forEach(val => newParams.append(type, val));
        } else {
            newParams.append(type, value);
        }
        newParams.delete('page');
        setSearchParams(newParams);
        if (onFilterChange) onFilterChange();
    };

    const updatePrice = (type, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(type, value);
        } else {
            newParams.delete(type);
        }
        setSearchParams(newParams);
    };

    return (
        <aside className="filter-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-primary)' }}>
                    Filters
                </h3>
                {(currentCategories.length > 0 || currentSizes.length > 0 || currentColors.length > 0 || minPrice || maxPrice) && (
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setSearchParams({})}
                        style={{ fontSize: 'var(--text-xs)', padding: '0' }}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Category */}
            <div className="filter-sidebar__section">
                <button className="filter-sidebar__title" onClick={() => toggle('category')}>
                    Category <ChevronDown size={16} style={{ transform: openSections.category ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openSections.category && (
                    <div className="filter-sidebar__options">
                        {categories.map((cat) => (
                            <label key={cat.id} className="checkbox">
                                <input
                                    type="checkbox"
                                    className="checkbox__input"
                                    checked={currentCategories.includes(cat.slug)}
                                    onChange={() => updateFilter('category', cat.slug)}
                                />
                                <span>{cat.name} ({cat.count})</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Price */}
            <div className="filter-sidebar__section">
                <button className="filter-sidebar__title" onClick={() => toggle('price')}>
                    Price <ChevronDown size={16} style={{ transform: openSections.price ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openSections.price && (
                    <div className="price-range">
                        <input
                            type="number"
                            className="price-range__input"
                            placeholder="₹ Min"
                            value={minPrice}
                            onChange={(e) => updatePrice('minPrice', e.target.value)}
                        />
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        <input
                            type="number"
                            className="price-range__input"
                            placeholder="₹ Max"
                            value={maxPrice}
                            onChange={(e) => updatePrice('maxPrice', e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Size */}
            <div className="filter-sidebar__section">
                <button className="filter-sidebar__title" onClick={() => toggle('size')}>
                    Size <ChevronDown size={16} style={{ transform: openSections.size ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openSections.size && (
                    <div className="filter-sidebar__size-options">
                        {sizes.map((s) => (
                            <button
                                key={s}
                                className={`filter-sidebar__size ${currentSizes.includes(s) ? 'filter-sidebar__size--active' : ''}`}
                                onClick={() => updateFilter('size', s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Color */}
            <div className="filter-sidebar__section">
                <button className="filter-sidebar__title" onClick={() => toggle('color')}>
                    Color <ChevronDown size={16} style={{ transform: openSections.color ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openSections.color && (
                    <div className="filter-sidebar__color-options">
                        {colorOptions.map((c) => (
                            <button
                                key={c.name}
                                className={`filter-sidebar__color ${currentColors.includes(c.name) ? 'filter-sidebar__color--active' : ''}`}
                                style={{ backgroundColor: c.hex, border: c.hex === '#FFFFFF' ? '1px solid var(--color-border)' : 'none' }}
                                title={c.name}
                                aria-label={c.name}
                                onClick={() => updateFilter('color', c.name)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}

export default function ProductListing() {
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const { products, isLoadingProducts } = useStore();

    // Filtering Logic
    const filteredProducts = useMemo(() => {
        if (!products.length) return [];
        let result = [...products];

        // Search
        const searchQuery = searchParams.get('search')?.toLowerCase().trim();
        if (searchQuery) {
            const terms = searchQuery.split(/\s+/).filter(Boolean);
            result = result.filter(p => {
                const searchableText = `${p.name} ${p.description} ${p.category} ${p.brand}`.toLowerCase();
                return terms.every(term => searchableText.includes(term));
            });
        }

        // Category
        const selectedCategories = searchParams.getAll('category');
        if (selectedCategories.length > 0) {
            result = result.filter(p => selectedCategories.includes(p.category));
        }

        // Price
        const minPrice = Number(searchParams.get('minPrice')) || 0;
        const maxPrice = Number(searchParams.get('maxPrice')) || Infinity;
        result = result.filter(p => p.price >= minPrice && p.price <= maxPrice);

        // Size
        const selectedSizes = searchParams.getAll('size');
        if (selectedSizes.length > 0) {
            result = result.filter(p => p.sizes.some(s => selectedSizes.includes(s)));
        }

        // Color
        const selectedColors = searchParams.getAll('color');
        if (selectedColors.length > 0) {
            result = result.filter(p => p.colors.some(c => selectedColors.includes(c.name)));
        }

        // Sorting
        const sortOption = searchParams.get('sort') || 'recommended';
        switch (sortOption) {
            case 'price-low':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                result.sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1));
                break;
            case 'popularity':
                result.sort((a, b) => b.reviewCount - a.reviewCount);
                break;
            default: // Recommended (default to id or randomish)
                break;
        }

        return result;
    }, [searchParams]);

    const handleSortChange = (e) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('sort', e.target.value);
        setSearchParams(newParams);
    };

    return (
        <div className="page">
            <div className="container">
                {/* Breadcrumb */}
                <div className="breadcrumb">
                    <Link to="/" className="breadcrumb__link">Home</Link>
                    <span className="breadcrumb__separator">/</span>
                    <span className="breadcrumb__current">All Products</span>
                </div>

                {/* Mobile Filter Toggle */}
                <button className="filter-toggle" onClick={() => setMobileFilterOpen(true)}>
                    <SlidersHorizontal size={16} /> Filters {(searchParams.toString() && filteredProducts.length !== products.length) ? '(Active)' : ''}
                </button>

                <div className="plp">
                    <FilterSidebar />

                    <div>
                        <div className="plp__header">
                            <p className="plp__count">
                                {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''} Found
                                {searchParams.get('search') && ` for "${searchParams.get('search')}"`}
                            </p>
                            <div className="plp__sort">
                                <span className="plp__sort-label">Sort by:</span>
                                <select
                                    className="plp__sort-select"
                                    value={searchParams.get('sort') || 'recommended'}
                                    onChange={handleSortChange}
                                >
                                    <option value="recommended">Recommended</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="newest">Newest First</option>
                                    <option value="popularity">Popularity</option>
                                </select>
                            </div>
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div className="product-grid">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
                                <ShoppingBag size={48} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                                <h3>No products found</h3>
                                <p>Try adjusting your filters or search criteria.</p>
                                <button
                                    className="btn btn--primary"
                                    style={{ marginTop: '20px' }}
                                    onClick={() => setSearchParams({})}
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}

                        {/* Pagination (Visual only for now as we don't have enough dummy data) */}
                        {filteredProducts.length > 0 && (
                            <div className="pagination">
                                <button className="pagination__btn">&laquo;</button>
                                <button className="pagination__btn pagination__btn--active">1</button>
                                <button className="pagination__btn">2</button>
                                <button className="pagination__btn">3</button>
                                <button className="pagination__btn">&raquo;</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter Overlay */}
            {mobileFilterOpen && (
                <div className="modal-overlay" onClick={() => setMobileFilterOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px', height: '100vh', borderRadius: 0, position: 'fixed', left: 0, top: 0 }}>
                        <div className="modal__header">
                            <h3 className="modal__title">Filters</h3>
                            <button onClick={() => setMobileFilterOpen(false)} aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="modal__body">
                            <FilterSidebar onFilterChange={() => setTimeout(() => setMobileFilterOpen(false), 300)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

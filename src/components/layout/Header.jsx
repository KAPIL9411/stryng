import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X, Grid3X3, Heart } from 'lucide-react';
import useStore from '../../store/useStore';

const navLinks = [
    { label: 'Men', path: '/products?category=men' },
    { label: 'Women', path: '/products?category=women' },
    { label: 'New Arrivals', path: '/products?sort=newest' },
    { label: 'Collections', path: '/products' },
    { label: 'Sale', path: '/products?sale=true' },
];

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const { getCartCount, wishlist, user, isAdmin } = useStore();
    const cartCount = getCartCount();
    const wishlistCount = wishlist.length;

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                navigate(`/products?search=${encodeURIComponent(query)}`);
                setMobileMenuOpen(false);
            }
        }
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    return (
        <>
            {/* Header */}
            <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
                <div className="header__inner">
                    {/* Left — Hamburger */}
                    <div className="header__left">
                        <button
                            className="header__menu-btn"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu size={24} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Center — Logo */}
                    <Link to="/" className="header__logo">
                        <img src="/images/stryingclothing.png" alt="Stryng Clothing" className="header__logo-img" />
                    </Link>

                    {/* Right — Search + Icons */}
                    <div className="header__actions">
                        <div className="header__search">
                            <Search size={18} strokeWidth={1.5} className="header__search-icon" />
                            <input
                                type="text"
                                className="header__search-input"
                                placeholder="Search here..."
                                aria-label="Search"
                                onKeyDown={handleSearch}
                            />
                        </div>

                        <Link to="/wishlist" className="header__action-btn" aria-label="Wishlist">
                            <Heart size={22} strokeWidth={1.5} />
                            {wishlistCount > 0 && <span className="header__badge">{wishlistCount}</span>}
                        </Link>

                        {/* Admin Link (only for admins) */}
                        {user && isAdmin() && (
                            <Link to="/admin" className="header__action-btn" aria-label="Admin Panel" title="Admin Panel">
                                <Grid3X3 size={22} strokeWidth={1.5} />
                            </Link>
                        )}

                        {/* Account — links to /account if signed in, /login if not */}
                        <Link to={user ? '/account' : '/login'} className="header__action-btn" aria-label="Account">
                            <User size={22} strokeWidth={1.5} />
                        </Link>

                        <Link to="/cart" className="header__action-btn header__action-btn--bag" aria-label="Cart">
                            <ShoppingBag size={22} strokeWidth={1.5} />
                            {cartCount > 0 && <span className="header__badge">{cartCount}</span>}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Drawer */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu--open' : ''}`}>
                <div className="mobile-menu__overlay" onClick={() => setMobileMenuOpen(false)} />
                <div className="mobile-menu__content">
                    <div className="mobile-menu__header">
                        <span className="header__logo">
                            <img src="/images/stryingclothing.png" alt="Stryng Clothing" className="mobile-menu__logo-img" />
                        </span>
                        <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                            <X size={22} />
                        </button>
                    </div>
                    <nav className="mobile-menu__nav">
                        {navLinks.map((link) => (
                            <Link key={link.label} to={link.path} className="mobile-menu__link">
                                {link.label}
                            </Link>
                        ))}
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-4) 0' }} />
                        {user ? (
                            <>
                                {isAdmin() && (
                                    <Link to="/admin" className="mobile-menu__link" style={{ color: 'var( --color-primary)' }}>Admin Dashboard</Link>
                                )}
                                <Link to="/account" className="mobile-menu__link">My Account</Link>
                            </>
                        ) : (
                            <Link to="/login" className="mobile-menu__link">Sign In</Link>
                        )}
                        <Link to="/wishlist" className="mobile-menu__link">Wishlist</Link>
                        <Link to="/cart" className="mobile-menu__link">Shopping Bag</Link>
                    </nav>
                </div>
            </div>
        </>
    );
}

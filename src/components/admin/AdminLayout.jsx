import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Search, Bell, Image, Menu, X, Users, Settings, BarChart3 } from 'lucide-react';
import useStore from '../../store/useStore';
import { useState } from 'react';

const sidebarItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
    { icon: <Package size={20} />, label: 'Products', path: '/admin/products' },
    { icon: <ShoppingCart size={20} />, label: 'Orders', path: '/admin/orders' },
    { icon: <Image size={20} />, label: 'Banners', path: '/admin/banners' },
];

export default function AdminLayout({ children }) {
    const { user, logout } = useStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <div className="admin-layout">
            {/* Mobile Menu Toggle */}
            <button 
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Overlay */}
            <div 
                className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
                onClick={closeMobileMenu}
            />

            {/* Sidebar */}
            <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="admin-sidebar__header">
                    <Link to="/" onClick={closeMobileMenu}>
                        <img src="/images/logo2.webp" alt="Stryng" className="admin-logo" />
                    </Link>
                    <span className="admin-badge">Admin</span>
                </div>

                <nav className="admin-nav">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={closeMobileMenu}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="admin-sidebar__footer">
                    <div className="admin-user-info">
                        <div className="avatar">
                            {user?.email?.[0].toUpperCase() || 'A'}
                        </div>
                        <div className="admin-user-details">
                            <p className="admin-user-name">{user?.full_name || 'Admin'}</p>
                            <p className="admin-user-email">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="admin-nav-item logout-btn">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <h2 className="page-title">
                        {sidebarItems.find(i => i.path === location.pathname)?.label || 'Admin Panel'}
                    </h2>

                    <div className="admin-actions">
                        <div className="user-profile hide-mobile">
                            <div className="avatar">
                                {user?.email?.[0].toUpperCase() || 'A'}
                            </div>
                            <span>{user?.email}</span>
                        </div>
                    </div>
                </header>

                <div className="admin-content-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
}

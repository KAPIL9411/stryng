import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Search, Bell, Image } from 'lucide-react';
import useStore from '../../store/useStore';

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

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar__header">
                    <img src="/images/stryingclothing.png" alt="Stryng" className="admin-logo" />
                    <span className="admin-badge">Admin</span>
                </div>

                <nav className="admin-nav">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="admin-sidebar__footer">
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
                        <div className="search-bar">
                            <Search size={18} />
                            <input type="text" placeholder="Search..." />
                        </div>
                        <div className="user-profile">
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

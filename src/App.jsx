import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useStore from './store/useStore';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Home from './pages/Home';
import ProductListing from './pages/ProductListing';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import OrderTracking from './pages/OrderTracking';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Admin Pages
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetails from './pages/admin/AdminOrderDetails';
import AdminBanners from './pages/admin/AdminBanners';
import ProductForm from './pages/admin/ProductForm';

// Auth
import ProtectedRoute from './components/ProtectedRoute';

// UI
import Preloader from './components/ui/Preloader';
import Toast from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';

// Admin Styles
import './styles/admin.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const { pathname } = useLocation();
  const { initializeAuth, fetchProducts } = useStore();

  useEffect(() => {
    initializeAuth();
    fetchProducts();
  }, []);

  return (
    <>
      <Preloader />
      <Toast />
      <ScrollToTop />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<ProductListing />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />

            {/* Protected Routes */}
            <Route path="account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="order/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
            <Route path="admin/products" element={<AdminRoute><AdminLayout><AdminProducts /></AdminLayout></AdminRoute>} />
            <Route path="admin/products/new" element={<AdminRoute><AdminLayout><ProductForm /></AdminLayout></AdminRoute>} />
            <Route path="admin/products/:id/edit" element={<AdminRoute><AdminLayout><ProductForm /></AdminLayout></AdminRoute>} />
            <Route path="admin/orders" element={<AdminRoute><AdminLayout><AdminOrders /></AdminLayout></AdminRoute>} />
            <Route path="admin/orders/:id" element={<AdminRoute><AdminLayout><AdminOrderDetails /></AdminLayout></AdminRoute>} />
            <Route path="admin/banners" element={<AdminRoute><AdminLayout><AdminBanners /></AdminLayout></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;


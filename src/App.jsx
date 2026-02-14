import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import useStore from './store/useStore';
import { initAnalytics, trackPageView } from './lib/analytics';
import { queryClient } from './lib/queryClient';
import { initPerformanceMonitoring } from './lib/performance';

// Layout
import Layout from './components/layout/Layout';

// Pages
const Home = lazy(() => import('./pages/Home'));
const ProductListing = lazy(() => import('./pages/ProductListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

// Admin Pages
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminOrderDetails = lazy(() => import('./pages/admin/AdminOrderDetails'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));

// Auth
import ProtectedRoute from './components/ProtectedRoute';

// UI
import Preloader from './components/ui/Preloader';
import Toast from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin Styles
import './styles/admin.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Track page view
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

function App() {
  const { pathname } = useLocation();
  const { initializeAuth } = useStore();

  useEffect(() => {
    // Initialize analytics
    initAnalytics();
    
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    // Initialize auth only (React Query handles data fetching)
    const initialize = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initialize();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Preloader />
      <Toast />
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="spinner" />
          </div>
        }>
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
        </Suspense>
      </ErrorBoundary>
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;


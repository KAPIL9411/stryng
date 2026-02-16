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
const CheckoutOptimized = lazy(() => import('./pages/CheckoutOptimized'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));
const Addresses = lazy(() => import('./pages/Addresses'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
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
const AdminPincodes = lazy(() => import('./pages/admin/AdminPincodes'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));

// Auth
import ProtectedRoute from './components/ProtectedRoute';

// UI
import Preloader from './components/ui/Preloader';
import Toast from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import SuspenseWrapper from './components/common/SuspenseWrapper';
import SessionExpired from './components/SessionExpired';
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
  const { initializeAuth } = useStore();

  useEffect(() => {
    // Make queryClient available globally for logout
    window.queryClient = queryClient;

    // Initialize analytics
    initAnalytics();

    // Initialize performance monitoring
    initPerformanceMonitoring();

    // Prefetch banners immediately for faster home page load
    queryClient.prefetchQuery({
      queryKey: ['banners', 'active'],
      queryFn: async () => {
        const { supabase } = await import('./lib/supabaseClient');
        const { data } = await supabase
          .from('banners')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch user addresses for faster checkout/addresses page load
    const prefetchAddresses = async () => {
      const { supabase } = await import('./lib/supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        queryClient.prefetchQuery({
          queryKey: ['addresses', user.id],
          queryFn: async () => {
            const { data } = await supabase
              .from('customer_addresses')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: false });
            return data || [];
          },
          staleTime: 2 * 60 * 1000, // 2 minutes
        });
      }
    };

    // Initialize auth only (React Query handles data fetching)
    const initialize = async () => {
      try {
        await initializeAuth();
        // Prefetch addresses after auth is initialized
        await prefetchAddresses();
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
      <SessionExpired />
      <ScrollToTop />
      <ErrorBoundary>
        <SuspenseWrapper>
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
              <Route
                path="account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="addresses"
                element={
                  <ProtectedRoute>
                    <Addresses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutOptimized />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <ProtectedRoute>
                    <OrderHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="order/:id"
                element={
                  <ProtectedRoute>
                    <OrderTracking />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/products"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminProducts />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/products/new"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <ProductForm />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/products/:id/edit"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <ProductForm />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/orders"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminOrders />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/orders/:id"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminOrderDetails />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/banners"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminBanners />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/pincodes"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminPincodes />
                    </AdminLayout>
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SuspenseWrapper>
      </ErrorBoundary>
      {/* React Query Devtools - only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { fetchProducts } from '../api/products.api';
import '../styles/auth-modern.css';

// Product banner images - only product photos
const bannerImages = [
  '/images/shirts.webp',
  '/images/trousers.webp',
  '/images/tshirts.webp',
  '/images/shirts.webp',
  '/images/trousers.webp',
  '/images/tshirts.webp',
  '/images/shirts.webp',
  '/images/trousers.webp',
  '/images/tshirts.webp',
  '/images/shirts.webp',
  '/images/trousers.webp',
  '/images/tshirts.webp',
];

export default function Login() {
  const {
    user,
    login,
    loginWithGoogle,
    isAuthLoading,
    authError,
    clearAuthError,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '');
  const [productImages, setProductImages] = useState([]);

  const redirectTo = location.state?.from || '/';

  // Fetch product images for background
  useEffect(() => {
    const loadProductImages = async () => {
      try {
        const result = await fetchProducts(1, 50); // Fetch first 50 products
        
        // Ensure we have a valid products array
        const products = Array.isArray(result?.products) ? result.products : [];
        
        // Get all product images from the database
        const images = products
          .filter(product => product.images && Array.isArray(product.images) && product.images.length > 0)
          .flatMap(product => product.images)
          .slice(0, 20); // Limit to 20 images for performance
        
        setProductImages(images.length > 0 ? images : [
          '/images/shirts.webp',
          '/images/trousers.webp',
          '/images/tshirts.webp',
        ]);
      } catch (error) {
        console.error('Error loading product images:', error);
        // Fallback to default images
        setProductImages([
          '/images/shirts.webp',
          '/images/trousers.webp',
          '/images/tshirts.webp',
        ]);
      }
    };
    
    loadProductImages();
  }, []);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    if (authError) clearAuthError();
    if (infoMessage) setInfoMessage('');
  }, [email, password, authError, clearAuthError, infoMessage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.user) {
      navigate(redirectTo);
    }
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  // Create masonry columns
  const columns = [[], [], [], []];
  productImages.forEach((img, index) => {
    columns[index % 4].push(img);
  });

  return (
    <div className="auth-modern-page">
      {/* Back Button */}
      <Link to="/" className="auth-back-button">
        <ArrowLeft size={20} />
      </Link>

      {/* Animated Masonry Background */}
      <div className="auth-banner-background">
        <div className="masonry-grid">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="masonry-column">
              {column.map((img, imgIndex) => {
                const heights = ['tall', 'medium', 'short'];
                const height = heights[(colIndex + imgIndex) % 3];
                return (
                  <div key={imgIndex} className={`masonry-item masonry-item--${height}`}>
                    <img src={img} alt={`Fashion ${imgIndex + 1}`} loading="lazy" />
                  </div>
                );
              })}
              {/* Duplicate for seamless loop */}
              {column.map((img, imgIndex) => {
                const heights = ['tall', 'medium', 'short'];
                const height = heights[(colIndex + imgIndex) % 3];
                return (
                  <div key={`dup-${imgIndex}`} className={`masonry-item masonry-item--${height}`}>
                    <img src={img} alt={`Fashion ${imgIndex + 1}`} loading="lazy" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Auth Form Overlay */}
      <div className="auth-form-overlay">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-logo">
              <img src="/images/logo2.webp" alt="Stryng Clothing" />
            </div>

            <div className="auth-header">
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to continue shopping</p>
            </div>

            {infoMessage && (
              <div className="auth-info-modern">
                <AlertCircle size={18} />
                <span>{infoMessage}</span>
              </div>
            )}

            {authError && (
              <div className="auth-error-modern">
                <AlertCircle size={18} />
                <span>{authError}</span>
              </div>
            )}

            <form className="auth-form-modern" onSubmit={handleLogin}>
              <div className="form-group-modern">
                <label className="form-label-modern">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} className="form-input-icon form-input-icon--label" />
                  <input
                    type="email"
                    className="form-input-modern"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isAuthLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group-modern">
                <label className="form-label-modern">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} className="form-input-icon form-input-icon--label" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input-modern"
                    placeholder="Enter your password"
                    style={{ paddingRight: '3rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isAuthLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="form-input-action form-input-action--label"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isAuthLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-row-modern">
                <label className="form-checkbox-modern">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="form-link-modern">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="btn-auth-primary"
                disabled={isAuthLoading}
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 size={18} className="spinner-modern" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="auth-divider-modern">or</div>

            <button
              className="btn-google-modern"
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <p className="auth-footer-modern">
              Don't have an account?{' '}
              <Link to="/register" className="auth-footer-link">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

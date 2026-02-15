import { Navigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';

/**
 * Protected route wrapper for authenticated-only pages
 * Redirects to login and stores intended destination
 */
export default function ProtectedRoute({ children }) {
  const { user, isLoadingAuth } = useStore();
  const location = useLocation();

  // Still checking auth state
  if (isLoadingAuth) {
    return (
      <div
        className="page"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  // Not authenticated - redirect to login with return URL
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Authenticated - render children
  return children;
}

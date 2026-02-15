import { Navigate } from 'react-router-dom';
import useStore from '../store/useStore';

/**
 * Protected route wrapper for admin pages
 * Redirects non-admin users to home page
 */
export default function AdminRoute({ children }) {
  const { user, isAdmin, isLoadingAuth } = useStore();

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

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin - redirect to home
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Admin user - render children
  return children;
}

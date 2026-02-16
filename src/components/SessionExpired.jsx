/**
 * Session Expired Component
 * Shows when user's session has expired
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function SessionExpired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('session_expired');

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    if (sessionExpired) {
      const timer = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, navigate]);

  if (!sessionExpired) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        maxWidth: '90%',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <AlertCircle size={24} color="#92400e" />
      <div>
        <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>
          Session Expired
        </strong>
        <p style={{ color: '#78350f', margin: 0, fontSize: '14px' }}>
          Your session has expired. Please log in again.
        </p>
      </div>
      <button
        onClick={() => navigate('/login', { replace: true })}
        style={{
          marginLeft: 'auto',
          padding: '8px 16px',
          background: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <RefreshCw size={16} />
        Login
      </button>
    </div>
  );
}

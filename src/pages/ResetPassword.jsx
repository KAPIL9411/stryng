import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import PasswordStrength from '../components/auth/PasswordStrength';

export default function ResetPassword() {
  const { updatePassword, isAuthLoading, authError, clearAuthError } =
    useStore();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    clearAuthError();

    // Listen for the RECOVERY event from Supabase (user clicked the reset link in email)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    // Also check if there's a hash fragment (for direct URL access)
    if (window.location.hash.includes('type=recovery')) {
      setIsReady(true);
    }

    // Give it a moment for the auth state to settle, then show form anyway
    const timer = setTimeout(() => setIsReady(true), 2000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (authError) clearAuthError();
    if (localError) setLocalError('');
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const result = await updatePassword(password);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  const displayError = localError || authError;

  if (success) {
    return (
      <div className="auth">
        <div className="auth__success-card">
          <CheckCircle2
            size={48}
            style={{ color: '#10B981', marginBottom: 'var(--space-4)' }}
          />
          <h1 className="auth__title">Password Updated!</h1>
          <p className="auth__subtitle">
            Your password has been successfully updated. You&apos;ll be
            redirected to login shortly.
          </p>
        </div>
        <p className="auth__footer">
          <Link to="/login" className="auth__link">
            Go to login now
          </Link>
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="auth" style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
        <p className="auth__subtitle">Verifying your reset link...</p>
      </div>
    );
  }

  return (
    <div className="auth">
      <h1 className="auth__title">Set New Password</h1>
      <p className="auth__subtitle">
        Create a strong password for your account
      </p>

      {displayError && (
        <div className="auth__error">
          <AlertCircle size={16} />
          <span>{displayError}</span>
        </div>
      )}

      <form
        className={`auth__form${isAuthLoading ? ' auth__form--disabled' : ''}`}
        onSubmit={handleSubmit}
      >
        <div className="input-group">
          <label className="input-group__label">New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              placeholder="Enter new password"
              style={{
                paddingLeft: 'var(--space-10)',
                paddingRight: 'var(--space-10)',
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isAuthLoading}
              autoFocus
            />
            <Lock
              size={18}
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div className="input-group">
          <label className="input-group__label">Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              style={{ paddingLeft: 'var(--space-10)' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isAuthLoading}
            />
            <Lock
              size={18}
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: '#EF4444',
                marginTop: 'var(--space-1)',
                marginBottom: 0,
              }}
            >
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`btn btn--primary btn--full btn--lg${isAuthLoading ? ' btn--loading' : ''}`}
          disabled={isAuthLoading}
        >
          {isAuthLoading ? (
            <>
              <Loader2 size={18} className="spin" />
              Updating password...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </form>

      <p className="auth__footer">
        <Link to="/login" className="auth__link">
          Back to login
        </Link>
      </p>
    </div>
  );
}

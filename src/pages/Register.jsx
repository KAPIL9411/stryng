import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import PasswordStrength from '../components/auth/PasswordStrength';

export default function Register() {
    const { user, register, loginWithGoogle, isAuthLoading, authError, clearAuthError } = useStore();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    // If already signed in, redirect to account
    useEffect(() => {
        if (user) navigate('/account', { replace: true });
    }, [user]);

    // Clear errors on mount
    useEffect(() => {
        clearAuthError();
    }, []);

    // Clear errors on input change
    useEffect(() => {
        if (authError) clearAuthError();
        if (localError) setLocalError('');
    }, [name, email, password, confirmPassword]);

    const handleRegister = async (e) => {
        e.preventDefault();

        // Name validation
        if (name.trim().length < 2) {
            setLocalError('Name must be at least 2 characters.');
            return;
        }
        if (name.trim().length > 50) {
            setLocalError('Name must be 50 characters or less.');
            return;
        }

        // Confirm password
        if (password !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        const result = await register(email, password, name.trim());
        if (result.success) {
            navigate('/account');
        }
    };

    const handleGoogleRegister = async () => {
        await loginWithGoogle();
    };

    const displayError = localError || authError;

    return (
        <div className="auth">
            <h1 className="auth__title">Create Account</h1>
            <p className="auth__subtitle">Join us and explore the latest in fashion</p>

            {displayError && (
                <div className="auth__error">
                    <AlertCircle size={16} />
                    <span>{displayError}</span>
                </div>
            )}

            <form className={`auth__form${isAuthLoading ? ' auth__form--disabled' : ''}`} onSubmit={handleRegister}>
                <div className="input-group">
                    <label className="input-group__label">Full Name</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="John Doe"
                            style={{ paddingLeft: 'var(--space-10)' }}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isAuthLoading}
                        />
                        <User size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-group__label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@email.com"
                            style={{ paddingLeft: 'var(--space-10)' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isAuthLoading}
                        />
                        <Mail size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-group__label">Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input"
                            placeholder="Create a password"
                            style={{ paddingLeft: 'var(--space-10)', paddingRight: 'var(--space-10)' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isAuthLoading}
                        />
                        <Lock size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <PasswordStrength password={password} />
                </div>

                <div className="input-group">
                    <label className="input-group__label">Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="password"
                            className="input"
                            placeholder="Confirm your password"
                            style={{ paddingLeft: 'var(--space-10)' }}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isAuthLoading}
                        />
                        <Lock size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                        <p style={{ fontSize: 'var(--text-xs)', color: '#EF4444', marginTop: 'var(--space-1)', marginBottom: 0 }}>
                            Passwords do not match
                        </p>
                    )}
                </div>

                <label className="checkbox">
                    <input type="checkbox" className="checkbox__input" required />
                    <span style={{ fontSize: 'var(--text-sm)' }}>
                        I agree to the <a href="#" style={{ textDecoration: 'underline' }}>Terms of Service</a> and <a href="#" style={{ textDecoration: 'underline' }}>Privacy Policy</a>
                    </span>
                </label>

                <button type="submit" className={`btn btn--primary btn--full btn--lg${isAuthLoading ? ' btn--loading' : ''}`} disabled={isAuthLoading}>
                    {isAuthLoading ? (
                        <>
                            <Loader2 size={18} className="spin" />
                            Creating account...
                        </>
                    ) : 'Create Account'}
                </button>
            </form>

            <div className="auth__divider">or register with</div>

            <div className="auth__social">
                <button className="auth__social-btn" onClick={handleGoogleRegister} disabled={isAuthLoading}>
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Sign up with Google
                </button>
            </div>

            <p className="auth__footer">
                Already have an account? <Link to="/login" className="auth__link">Sign in</Link>
            </p>
        </div>
    );
}

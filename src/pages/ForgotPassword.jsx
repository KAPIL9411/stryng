import { Link } from 'react-router-dom';
import { Mail, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';

export default function ForgotPassword() {
    const { resetPassword, isAuthLoading, authError, clearAuthError } = useStore();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    useEffect(() => {
        clearAuthError();
    }, []);

    useEffect(() => {
        if (authError) clearAuthError();
    }, [email]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await resetPassword(email);
        if (result.success) {
            setSent(true);
        }
    };

    if (sent) {
        return (
            <div className="auth">
                <div className="auth__success-card">
                    <CheckCircle2 size={48} style={{ color: '#10B981', marginBottom: 'var(--space-4)' }} />
                    <h1 className="auth__title">Check Your Email</h1>
                    <p className="auth__subtitle">
                        We&apos;ve sent a password reset link to <strong>{email}</strong>.
                        Please check your inbox and click the link to reset your password.
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                        Didn&apos;t receive the email? Check your spam folder.
                    </p>
                </div>
                <p className="auth__footer">
                    <Link to="/login" className="auth__link" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <ArrowLeft size={14} /> Back to login
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="auth">
            <h1 className="auth__title">Forgot Password</h1>
            <p className="auth__subtitle">Enter your email and we&apos;ll send you a reset link</p>

            {authError && (
                <div className="auth__error">
                    <AlertCircle size={16} />
                    <span>{authError}</span>
                </div>
            )}

            <form className={`auth__form${isAuthLoading ? ' auth__form--disabled' : ''}`} onSubmit={handleSubmit}>
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
                            autoFocus
                        />
                        <Mail size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    </div>
                </div>

                <button type="submit" className={`btn btn--primary btn--full btn--lg${isAuthLoading ? ' btn--loading' : ''}`} disabled={isAuthLoading}>
                    {isAuthLoading ? (
                        <>
                            <Loader2 size={18} className="spin" />
                            Sending reset link...
                        </>
                    ) : 'Send Reset Link'}
                </button>
            </form>

            <p className="auth__footer">
                Remember your password? <Link to="/login" className="auth__link">Sign in</Link>
            </p>
        </div>
    );
}

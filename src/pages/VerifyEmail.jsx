import { Link, useLocation } from 'react-router-dom';
import { MailCheck, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';

export default function VerifyEmail() {
    const { resendVerificationEmail, isAuthLoading, authError, clearAuthError } = useStore();
    const location = useLocation();
    const email = location.state?.email || '';
    const [cooldown, setCooldown] = useState(0);
    const [resendSuccess, setResendSuccess] = useState(false);

    useEffect(() => {
        clearAuthError();
    }, []);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResend = useCallback(async () => {
        if (cooldown > 0 || !email) return;
        setResendSuccess(false);
        const result = await resendVerificationEmail(email);
        if (result.success) {
            setResendSuccess(true);
            setCooldown(60);
        }
    }, [cooldown, email, resendVerificationEmail]);

    return (
        <div className="auth">
            <div className="auth__success-card">
                <MailCheck size={48} style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-4)' }} />
                <h1 className="auth__title">Verify Your Email</h1>
                <p className="auth__subtitle">
                    We&apos;ve sent a verification link to{' '}
                    {email ? <strong>{email}</strong> : 'your email address'}.
                    Please check your inbox and click the link to verify your account.
                </p>

                <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                    <p style={{ marginBottom: 'var(--space-2)', fontWeight: 'var(--font-medium)' }}>
                        📧 Can&apos;t find the email?
                    </p>
                    <ul style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', listStyle: 'disc', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <li>Check your spam or junk folder</li>
                        <li>Make sure you entered the correct email</li>
                        <li>Wait a few minutes for the email to arrive</li>
                    </ul>
                </div>

                {authError && (
                    <div className="auth__error" style={{ marginTop: 'var(--space-4)' }}>
                        <AlertCircle size={16} />
                        <span>{authError}</span>
                    </div>
                )}

                {resendSuccess && (
                    <div className="auth__success" style={{ marginTop: 'var(--space-4)' }}>
                        Verification email resent successfully!
                    </div>
                )}

                {email && (
                    <button
                        className={`btn btn--primary btn--full btn--lg${isAuthLoading ? ' btn--loading' : ''}`}
                        onClick={handleResend}
                        disabled={isAuthLoading || cooldown > 0}
                        style={{ marginTop: 'var(--space-6)' }}
                    >
                        {isAuthLoading ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                Sending...
                            </>
                        ) : cooldown > 0 ? (
                            `Resend in ${cooldown}s`
                        ) : (
                            'Resend Verification Email'
                        )}
                    </button>
                )}
            </div>

            <p className="auth__footer">
                Already verified? <Link to="/login" className="auth__link">Sign in</Link>
            </p>
        </div>
    );
}

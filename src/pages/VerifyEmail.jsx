import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { reload, sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { mapAuthError } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

/**
 * VerifyEmail — shown after registration to prompt the user to check their inbox.
 *
 * Firebase handles the verification link entirely on their own infrastructure:
 *  1. sendEmailVerification(user) → Firebase emails user a link
 *  2. User clicks link → Firebase marks emailVerified = true on the Auth token
 *  3. This page calls reload(auth.currentUser) to re-fetch the token
 *  4. If emailVerified is now true → show success + redirect to dashboard
 *
 * ⚠️ The old custom token system (hashToken + localhost:3001) is removed.
 *    Firebase's built-in flow works without any backend.
 */
export default function VerifyEmail() {
    const { user, refreshUser, getDashboardPath } = useAuth();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isVerified, setIsVerified] = useState(
        auth.currentUser?.emailVerified ?? user?.emailVerified ?? false
    );
    const [resendMsg, setResendMsg] = useState('');
    const [resendError, setResendError] = useState('');

    // Countdown timer for resend cooldown (60s)
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // If already verified, show success and redirect shortly
    useEffect(() => {
        if (isVerified) {
            const t = setTimeout(() => navigate(getDashboardPath(user?.role)), 3000);
            return () => clearTimeout(t);
        }
    }, [isVerified, navigate, getDashboardPath, user?.role]);

    /**
     * Ask Firebase to re-read the auth token so emailVerified is up-to-date.
     * The user clicks this after they have clicked the link in their inbox.
     */
    const handleCheckVerification = async () => {
        setChecking(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                toast.error('Please sign in again and return to this page.');
                navigate('/login');
                return;
            }
            // Force a token refresh so emailVerified reflects reality
            await reload(currentUser);

            if (currentUser.emailVerified) {
                setIsVerified(true);
                // Also sync Firestore record so the context stays consistent
                await refreshUser();
                toast.success('Email verified! Redirecting…');
            } else {
                toast.error("Email not verified yet. Click the link in your inbox first.");
            }
        } catch (err) {
            toast.error(mapAuthError(err));
        } finally {
            setChecking(false);
        }
    };

    /**
     * Resend the Firebase verification email.
     * Firebase enforces its own rate-limit; we also impose a 60 s client cooldown.
     */
    const handleResend = async () => {
        setResendMsg('');
        setResendError('');
        const currentUser = auth.currentUser;
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setResending(true);
        try {
            await sendEmailVerification(currentUser);
            setResendMsg('Verification email sent! Check your inbox.');
            setResendCooldown(60);
        } catch (err) {
            setResendError(mapAuthError(err));
        } finally {
            setResending(false);
        }
    };

    // ── Verified state ───────────────────────────────────────────────────────
    if (isVerified) {
        return (
            <div className="auth-page">
                <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
                    <div className="auth-card__header">
                        <div className="auth-card__logo">CV</div>
                        <h1 className="auth-card__title">Email Verified!</h1>
                    </div>
                    <div style={{ padding: 'var(--space-4) var(--space-8) var(--space-8)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
                        <p style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>
                            Your email has been verified. You can now book consultations
                            and access all features.
                        </p>
                        <p style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
                            Redirecting to your dashboard…
                        </p>
                        <Link
                            to={getDashboardPath(user?.role)}
                            className="btn btn--gold"
                            style={{ marginTop: 'var(--space-5)', display: 'inline-block' }}
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Awaiting verification ────────────────────────────────────────────────
    const displayEmail = auth.currentUser?.email || user?.email || 'your email';

    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
                <div className="auth-card__header">
                    <div className="auth-card__logo">CV</div>
                    <h1 className="auth-card__title">Verify Your Email</h1>
                    <p className="auth-card__subtitle">One more step!</p>
                </div>

                <div style={{ padding: 'var(--space-4) var(--space-8) var(--space-8)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>

                    <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                        We sent a verification link to <strong>{displayEmail}</strong>.
                        Click the link in that email, then come back here.
                    </p>

                    <p style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
                        Check your spam folder if you don&apos;t see it within a minute.
                    </p>

                    {/* Primary CTA: user has clicked the link and comes back */}
                    <button
                        className="btn btn--gold btn--lg"
                        style={{ width: '100%', marginBottom: 'var(--space-3)' }}
                        onClick={handleCheckVerification}
                        disabled={checking}
                    >
                        {checking ? 'Checking…' : "I've verified — Continue"}
                    </button>

                    {/* Resend */}
                    {resendMsg && (
                        <p style={{ color: 'var(--green-600, #16a34a)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                            {resendMsg}
                        </p>
                    )}
                    {resendError && (
                        <p style={{ color: 'var(--red-600, #dc2626)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                            {resendError}
                        </p>
                    )}
                    <button
                        className="btn btn--outline btn--lg"
                        style={{ width: '100%', marginBottom: 'var(--space-3)' }}
                        onClick={handleResend}
                        disabled={resending || resendCooldown > 0}
                    >
                        {resending
                            ? 'Sending…'
                            : resendCooldown > 0
                                ? `Resend in ${resendCooldown}s`
                                : 'Resend Verification Email'}
                    </button>

                    <Link to="/login" style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

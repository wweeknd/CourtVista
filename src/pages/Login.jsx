import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
    const { login, loginWithGoogle, getDashboardPath, sendPasswordReset } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    // ── Forgot Password state ────────────────────────────────────────────────
    const [showForgot, setShowForgot]         = useState(false);
    const [forgotEmail, setForgotEmail]       = useState('');
    const [forgotLoading, setForgotLoading]   = useState(false);
    const [forgotError, setForgotError]       = useState('');
    const [forgotSuccess, setForgotSuccess]   = useState(false);

    // ── Login ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        if (loading) return;
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        try {
            const result = await login(email, password);
            if (result.success) {
                toast.success(`Welcome back, ${result.user.name}!`);
                navigate(getDashboardPath(result.user.role));
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Google Sign-in ───────────────────────────────────────────────────────
    const handleGoogleLogin = async () => {
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            const result = await loginWithGoogle();
            if (result.success) {
                if (result.needsRole) {
                    navigate('/select-role');
                } else {
                    toast.success(`Welcome, ${result.user.name}!`);
                    navigate(getDashboardPath(result.user.role));
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(err.message || 'Google sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    // ── Forgot Password ──────────────────────────────────────────────────────
    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotSuccess(false);

        if (!forgotEmail.trim()) {
            setForgotError('Please enter your email address.');
            return;
        }

        setForgotLoading(true);
        try {
            const result = await sendPasswordReset(forgotEmail);
            if (result.success) {
                setForgotSuccess(true);
            } else {
                setForgotError(result.message);
            }
        } finally {
            setForgotLoading(false);
        }
    };

    // ── Forgot Password panel ────────────────────────────────────────────────
    if (showForgot) {
        return (
            <div className="auth-page">
                <div className="auth-card animate-fade-in-up">
                    <div className="auth-card__header">
                        <div className="auth-card__logo">CV</div>
                        <h1 className="auth-card__title">Reset Password</h1>
                        <p className="auth-card__subtitle">
                            Enter your email and we&apos;ll send a reset link
                        </p>
                    </div>

                    {forgotSuccess ? (
                        <div style={{ padding: 'var(--space-4) var(--space-8) var(--space-8)', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>
                            <p style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>
                                Password reset email sent to <strong>{forgotEmail}</strong>.
                                Check your inbox (and spam folder) for the link.
                            </p>
                            <button
                                className="btn btn--gold btn--lg"
                                style={{ marginTop: 'var(--space-6)', width: '100%' }}
                                onClick={() => { setShowForgot(false); setForgotSuccess(false); }}
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <form className="auth-form" onSubmit={handleForgotSubmit}>
                            {forgotError && <div className="auth-error">{forgotError}</div>}

                            <div className="form-group">
                                <label className="form-label" htmlFor="forgot-email">
                                    Email Address
                                </label>
                                <input
                                    className="form-input"
                                    type="email"
                                    id="forgot-email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    disabled={forgotLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn--gold btn--lg"
                                style={{ width: '100%' }}
                                disabled={forgotLoading}
                            >
                                {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                            </button>

                            <button
                                type="button"
                                className="btn btn--outline btn--lg"
                                style={{ width: '100%', marginTop: 'var(--space-2)' }}
                                onClick={() => { setShowForgot(false); setForgotError(''); }}
                                disabled={forgotLoading}
                            >
                                ← Back to Login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // ── Login form ───────────────────────────────────────────────────────────
    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in-up">
                <div className="auth-card__header">
                    <div className="auth-card__logo">CV</div>
                    <h1 className="auth-card__title">Welcome Back</h1>
                    <p className="auth-card__subtitle">Sign in to your CourtVista account</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email Address</label>
                        <input
                            className="form-input"
                            type="email"
                            id="login-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label" htmlFor="login-password">Password</label>
                            <button
                                type="button"
                                onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--gold-600)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 500,
                                    padding: 0,
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                        <input
                            className="form-input"
                            type="password"
                            id="login-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn--gold btn--lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>

                    <div style={{ textAlign: 'center', margin: '15px 0' }}>
                        <span style={{ color: '#888' }}>OR</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="btn google-btn"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            border: '1px solid #ddd',
                            background: '#fff',
                            borderRadius: '8px',
                            padding: '10px',
                            cursor: 'pointer',
                            transition: '0.2s ease',
                        }}
                        disabled={loading}
                    >
                        <img
                            src="https://developers.google.com/identity/images/g-logo.png"
                            width="20"
                            alt="Google"
                        />
                        Continue with Google
                    </button>
                </form>

                <div className="auth-card__footer">
                    Don&apos;t have an account? <Link to="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
}

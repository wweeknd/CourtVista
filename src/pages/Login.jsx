import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
    const { login, loginWithGoogle, getDashboardPath } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
                navigate(getDashboardPath());
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (loading) return;

        setError('');
        setLoading(true);

        try {
            const result = await loginWithGoogle();

            if (result.success) {
                if (result.needsRole) {
                    navigate("/select-role");
                } else {
                    toast.success(`Welcome, ${result.user.name}!`);
                    navigate(getDashboardPath());
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(err.message || "Google sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

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
                        <label className="form-label" htmlFor="login-password">Password</label>
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

                    <button type="submit" className="btn btn--gold btn--lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
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
                            transition: '0.2s ease'
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

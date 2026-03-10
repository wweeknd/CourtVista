import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initiateEmailVerification } from '../utils/emailClient';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Register() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('user');
    const [error, setError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length < 4) {
            setError('Password must be at least 4 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const result = await register({ name, email, password, role });
            if (result.success) {
                toast.success("Account created successfully!");

                // Send verification email — do NOT auto-login
                await initiateEmailVerification(email.toLowerCase(), name);
                setVerificationSent(true);
            } else {
                setError(result.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Show verification sent message
    if (verificationSent) {
        return (
            <div className="auth-page">
                <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
                    <div className="auth-card__header">
                        <div className="auth-card__logo">CV</div>
                        <h1 className="auth-card__title">Check Your Email</h1>
                        <p className="auth-card__subtitle">Almost there!</p>
                    </div>
                    <div style={{ padding: 'var(--space-4) var(--space-8) var(--space-8)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>
                            We&apos;ve sent a verification link to <strong>{email}</strong>.
                            Please check your inbox and click the link to verify your account.
                        </p>
                        <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>
                            The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
                        </p>
                        <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                            <Link to="/login" className="btn btn--gold">
                                Go to Login
                            </Link>
                            <Link to="/" className="btn btn--outline">
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in-up">
                <div className="auth-card__header">
                    <div className="auth-card__logo">CV</div>
                    <h1 className="auth-card__title">Create Account</h1>
                    <p className="auth-card__subtitle">Join CourtVista to find the right legal help</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-name">Full Name</label>
                        <input
                            className="form-input"
                            type="text"
                            id="reg-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Email Address</label>
                        <input
                            className="form-input"
                            type="email"
                            id="reg-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            id="reg-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <input
                            className="form-input"
                            type="password"
                            id="reg-confirm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">I am a</label>
                        <div className="auth-role-selector">
                            <div className="auth-role-option">
                                <input
                                    type="radio"
                                    id="role-user"
                                    name="role"
                                    value="user"
                                    checked={role === 'user'}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={loading}
                                />
                                <label htmlFor="role-user">
                                    <span className="auth-role-option__icon">👤</span>
                                    User
                                </label>
                            </div>
                            <div className="auth-role-option">
                                <input
                                    type="radio"
                                    id="role-lawyer"
                                    name="role"
                                    value="lawyer"
                                    checked={role === 'lawyer'}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={loading}
                                />
                                <label htmlFor="role-lawyer">
                                    <span className="auth-role-option__icon">⚖️</span>
                                    Lawyer
                                </label>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn--gold btn--lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-card__footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

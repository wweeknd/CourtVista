import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

// Password must be ≥ 8 chars, at least 1 uppercase, at least 1 digit
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName]                     = useState('');
    const [email, setEmail]                   = useState('');
    const [password, setPassword]             = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole]                     = useState('user');
    const [loading, setLoading]               = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);

    // Per-field inline errors (validated on blur + before submit)
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // ── Blur validators ──────────────────────────────────────────────────────
    const validateName = (val = name) => {
        if (!val.trim()) return 'Full name is required.';
        if (val.trim().length < 2) return 'Name must be at least 2 characters.';
        return '';
    };

    const validateEmail = (val = email) => {
        if (!val.trim()) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address.';
        return '';
    };

    const validatePassword = (val = password) => {
        if (!val) return 'Password is required.';
        if (!PASSWORD_RE.test(val)) return 'Min 8 chars, 1 uppercase letter, 1 number.';
        return '';
    };

    const validateConfirm = (val = confirmPassword) => {
        if (!val) return 'Please confirm your password.';
        if (val !== password) return 'Passwords do not match.';
        return '';
    };

    const handleBlur = (field) => {
        const validators = {
            name: validateName,
            email: validateEmail,
            password: validatePassword,
            confirmPassword: validateConfirm,
        };
        setErrors(prev => ({ ...prev, [field]: validators[field]() }));
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Run all validators at once
        const newErrors = {
            name: validateName(),
            email: validateEmail(),
            password: validatePassword(),
            confirmPassword: validateConfirm(),
        };
        setErrors(newErrors);
        if (Object.values(newErrors).some(Boolean)) return;

        setLoading(true);
        try {
            const result = await register({ name, email, password, role });
            if (result.success) {
                toast.success('Account created! Please verify your email.');
                setVerificationSent(true);
            } else {
                setErrors(prev => ({ ...prev, email: result.message }));
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Post-registration: email sent confirmation ───────────────────────────
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
                            The link expires after some time. Check your spam folder if you don&apos;t see it.
                        </p>
                        <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
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

    // ── Registration form ────────────────────────────────────────────────────
    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in-up">
                <div className="auth-card__header">
                    <div className="auth-card__logo">CV</div>
                    <h1 className="auth-card__title">Create Account</h1>
                    <p className="auth-card__subtitle">Join CourtVista to find the right legal help</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>

                    {/* Full Name */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-name">Full Name</label>
                        <input
                            className={`form-input${errors.name ? ' form-input--error' : ''}`}
                            type="text"
                            id="reg-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => handleBlur('name')}
                            placeholder="Enter your full name"
                            disabled={loading}
                        />
                        {errors.name && <span className="form-field-error">{errors.name}</span>}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Email Address</label>
                        <input
                            className={`form-input${errors.email ? ' form-input--error' : ''}`}
                            type="email"
                            id="reg-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => handleBlur('email')}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                        />
                        {errors.email && <span className="form-field-error">{errors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <input
                            className={`form-input${errors.password ? ' form-input--error' : ''}`}
                            type="password"
                            id="reg-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => handleBlur('password')}
                            placeholder="Min 8 chars, 1 uppercase, 1 number"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                        {errors.password && <span className="form-field-error">{errors.password}</span>}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <input
                            className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`}
                            type="password"
                            id="reg-confirm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => handleBlur('confirmPassword')}
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                        {errors.confirmPassword && <span className="form-field-error">{errors.confirmPassword}</span>}
                    </div>

                    {/* Role selector */}
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

                    <button
                        type="submit"
                        className="btn btn--gold btn--lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-card__footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

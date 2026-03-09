import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initiateEmailVerification } from '../utils/emailClient';
import './AuthModal.css';

/**
 * AuthModal — Login/Register modal shown when an unauthenticated user tries
 * a protected action (e.g., booking a consultation).
 *
 * Props:
 *   isOpen (boolean) — show/hide the modal
 *   onClose () — callback to close the modal
 *   onSuccess (user) — callback when login/register succeeds
 *   message (string) — optional call-to-action message
 */
export default function AuthModal({ isOpen, onClose, onSuccess, message }) {
    const { login, register } = useAuth();
    const [tab, setTab] = useState('login');
    const [error, setError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register form state
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [regRole, setRegRole] = useState('user');

    if (!isOpen) return null;

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (!loginEmail || !loginPassword) {
            setError('Please fill in all fields.');
            return;
        }

        const result = login(loginEmail, loginPassword);
        if (result.success) {
            onSuccess?.(result.user);
            onClose();
        } else {
            setError(result.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!regName || !regEmail || !regPassword || !regConfirm) {
            setError('Please fill in all fields.');
            return;
        }

        if (regPassword.length < 4) {
            setError('Password must be at least 4 characters.');
            return;
        }

        if (regPassword !== regConfirm) {
            setError('Passwords do not match.');
            return;
        }

        const result = register({ name: regName, email: regEmail, password: regPassword, role: regRole });
        if (result.success) {
            // Send verification email
            await initiateEmailVerification(regEmail.toLowerCase(), regName);
            setVerificationSent(true);
        } else {
            setError(result.message);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="auth-modal__overlay" onClick={handleOverlayClick}>
            <div className="auth-modal animate-fade-in-up">
                <button className="auth-modal__close" onClick={onClose} aria-label="Close">
                    ✕
                </button>

                {verificationSent ? (
                    <div className="auth-modal__verification-sent">
                        <div className="auth-modal__check-icon">📧</div>
                        <h2>Check Your Email</h2>
                        <p>
                            We&apos;ve sent a verification link to <strong>{regEmail}</strong>.
                            Please verify your email to complete booking.
                        </p>
                        <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
                            The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
                        </p>
                        <button className="btn btn--outline" onClick={onClose} style={{ marginTop: 'var(--space-5)' }}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="auth-modal__header">
                            <div className="auth-card__logo" style={{ margin: '0 auto var(--space-3)' }}>CV</div>
                            {message && (
                                <p className="auth-modal__message">{message}</p>
                            )}
                        </div>

                        <div className="auth-modal__tabs">
                            <button
                                className={`auth-modal__tab ${tab === 'login' ? 'auth-modal__tab--active' : ''}`}
                                onClick={() => { setTab('login'); setError(''); }}
                            >
                                Sign In
                            </button>
                            <button
                                className={`auth-modal__tab ${tab === 'register' ? 'auth-modal__tab--active' : ''}`}
                                onClick={() => { setTab('register'); setError(''); }}
                            >
                                Create Account
                            </button>
                        </div>

                        {error && <div className="auth-error" style={{ margin: '0 var(--space-6)' }}>{error}</div>}

                        {tab === 'login' ? (
                            <form className="auth-modal__form" onSubmit={handleLogin}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="modal-login-email">Email</label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        id="modal-login-email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="modal-login-pw">Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        id="modal-login-pw"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                    />
                                </div>
                                <button type="submit" className="btn btn--gold btn--lg" style={{ width: '100%' }}>
                                    Sign In
                                </button>
                            </form>
                        ) : (
                            <form className="auth-modal__form" onSubmit={handleRegister}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="modal-reg-name">Full Name</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        id="modal-reg-name"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="modal-reg-email">Email</label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        id="modal-reg-email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="modal-reg-pw">Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        id="modal-reg-pw"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        placeholder="Create a password"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="modal-reg-confirm">Confirm Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        id="modal-reg-confirm"
                                        value={regConfirm}
                                        onChange={(e) => setRegConfirm(e.target.value)}
                                        placeholder="Confirm password"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">I am a</label>
                                    <div className="auth-role-selector">
                                        <div className="auth-role-option">
                                            <input type="radio" id="modal-role-user" name="modal-role" value="user"
                                                checked={regRole === 'user'} onChange={(e) => setRegRole(e.target.value)} />
                                            <label htmlFor="modal-role-user">
                                                <span className="auth-role-option__icon">👤</span> User
                                            </label>
                                        </div>
                                        <div className="auth-role-option">
                                            <input type="radio" id="modal-role-lawyer" name="modal-role" value="lawyer"
                                                checked={regRole === 'lawyer'} onChange={(e) => setRegRole(e.target.value)} />
                                            <label htmlFor="modal-role-lawyer">
                                                <span className="auth-role-option__icon">⚖️</span> Lawyer
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn--gold btn--lg" style={{ width: '100%' }}>
                                    Create Account
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

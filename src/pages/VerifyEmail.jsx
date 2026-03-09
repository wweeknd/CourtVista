import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { hashToken, verifyStoredToken } from '../utils/emailClient';
import './Auth.css';

/**
 * VerifyEmail — user lands here from the email verification link.
 * URL format: /verify-email?token=xxx&email=yyy
 * Validates the token against the SHA-256 hash stored in the user's localStorage record.
 */
export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying | success | error | expired
    const [message, setMessage] = useState('');

    useEffect(() => {
        async function verify() {
            const token = searchParams.get('token');
            const email = searchParams.get('email');

            if (!token || !email) {
                setStatus('error');
                setMessage('Invalid verification link. Missing token or email.');
                return;
            }

            try {
                // Hash the token from the URL and compare with stored hash
                const tokenHash = await hashToken(token);
                const result = verifyStoredToken(email, tokenHash);

                if (result.success) {
                    setStatus('success');
                    setMessage(result.message);
                } else if (result.expired) {
                    setStatus('expired');
                    setMessage(result.message);
                } else {
                    setStatus('error');
                    setMessage(result.message);
                }
            } catch (err) {
                console.error('Verification error:', err);
                setStatus('error');
                setMessage('An unexpected error occurred during verification.');
            }
        }

        verify();
    }, [searchParams]);

    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
                <div className="auth-card__header">
                    <div className="auth-card__logo">CV</div>
                    <h1 className="auth-card__title">Email Verification</h1>
                </div>

                <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
                    {status === 'verifying' && (
                        <div className="verify-status">
                            <div className="verify-status__icon verify-status__icon--loading">⏳</div>
                            <h2>Verifying your email...</h2>
                            <p>Please wait while we verify your email address.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="verify-status">
                            <div className="verify-status__icon verify-status__icon--success">✅</div>
                            <h2>Email Verified!</h2>
                            <p>{message}</p>
                            <p style={{ color: 'var(--gray-500)', marginTop: 'var(--space-3)' }}>
                                You can now book consultations and access all features.
                            </p>
                            <Link to="/login" className="btn btn--gold" style={{ marginTop: 'var(--space-5)', display: 'inline-block' }}>
                                Sign In
                            </Link>
                        </div>
                    )}

                    {status === 'expired' && (
                        <div className="verify-status">
                            <div className="verify-status__icon verify-status__icon--expired">⏰</div>
                            <h2>Link Expired</h2>
                            <p>{message}</p>
                            <p style={{ color: 'var(--gray-500)', marginTop: 'var(--space-3)' }}>
                                Please log in and request a new verification email.
                            </p>
                            <Link to="/login" className="btn btn--outline" style={{ marginTop: 'var(--space-5)', display: 'inline-block' }}>
                                Go to Login
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="verify-status">
                            <div className="verify-status__icon verify-status__icon--error">❌</div>
                            <h2>Verification Failed</h2>
                            <p>{message}</p>
                            <Link to="/" className="btn btn--outline" style={{ marginTop: 'var(--space-5)', display: 'inline-block' }}>
                                Go Home
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

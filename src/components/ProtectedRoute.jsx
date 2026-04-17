import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps a page that requires authentication.
 *
 * Props:
 *   allowedRoles (array) — e.g. ['user'], ['lawyer'], ['admin']
 *   children — the page component to render
 *
 * Behavior:
 *   - Auth resolving → show full-page spinner (prevents redirect flicker on refresh)
 *   - Not logged in → redirect to /login
 *   - Logged in but wrong role → redirect to /
 */
export default function ProtectedRoute({ allowedRoles, children }) {
    const { user, authLoading } = useAuth();

    // Wait for onAuthStateChanged to fire before making any redirect decisions.
    // Without this, every hard-refresh boots users to /login because user === null
    // for the ~300ms it takes Firebase to restore the session.
    if (authLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh',
                flexDirection: 'column',
                gap: '1rem',
            }}>
                <div className="spinner" />
                <p style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>
                    Loading…
                </p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

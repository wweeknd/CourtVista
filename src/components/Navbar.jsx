import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from "../assets/logo.png";
import './Navbar.css';

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, getDashboardPath } = useAuth();

    // Lock body scroll when menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
        // Cleanup on unmount
        return () => document.body.classList.remove('menu-open');
    }, [mobileOpen]);

    // Close menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const getLinks = () => {
        if (!user) {
            return [
                { to: '/', label: 'Home' },
                { to: '/search', label: 'Find a Lawyer' },
                { to: '/compare', label: 'Compare' },
                { to: '/qna', label: 'Legal Q&A' },
            ];
        }

        switch (user.role) {
            case 'lawyer':
                return [
                    { to: '/', label: 'Home' },
                    { to: '/dashboard/lawyer', label: 'Clients & Practice' },
                    { to: '/messages', label: 'Messages' },
                    { to: '/qna', label: 'Legal Q&A' },
                ];
            case 'admin':
                return [
                    { to: '/', label: 'Home' },
                    { to: '/dashboard/admin', label: 'Admin Panel' },
                    { to: '/search', label: 'Manage Lawyers' },
                    { to: '/qna', label: 'Legal Q&A' },
                ];
            default:
                return [
                    { to: '/', label: 'Home' },
                    { to: '/search', label: 'Find a Lawyer' },
                    { to: '/compare', label: 'Compare' },
                    { to: '/dashboard/user', label: 'My Consultations' },
                    { to: '/messages', label: 'Messages' },
                    { to: '/qna', label: 'Legal Q&A' },
                ];
        }
    };

    const links = getLinks();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        logout();
        setMobileOpen(false);
        navigate('/');
    };

    const closeMobile = () => setMobileOpen(false);

    return (
        <>
            <nav className="navbar">
                <div className="navbar__inner">
                    <Link to="/" className="navbar__brand" onClick={closeMobile}>
                        <img src={logo} alt="CourtVista Logo" className="navbar__logo" />
                        <span className="navbar__brand-text">
                            Court<span>Vista</span>
                        </span>
                    </Link>

                    <div className="navbar__links">
                        {links.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`navbar__link ${isActive(link.to) ? 'navbar__link--active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="navbar__actions">
                        {user ? (
                            <>
                                <Link to={getDashboardPath()} className="navbar__user-btn">
                                    <span className="navbar__user-avatar" data-role={user.role} style={{
                                        backgroundImage: user.profilePicture ? `url(${user.profilePicture})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        color: user.profilePicture ? 'transparent' : 'white'
                                    }}>
                                        {!user.profilePicture && user.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="navbar__user-name">{user.name}</span>
                                    <span className="navbar__user-role">{user.role}</span>
                                </Link>
                                <button onClick={handleLogout} className="btn btn--outline btn--sm">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn--outline btn--sm">Login</Link>
                                <Link to="/register" className="btn btn--gold btn--sm">Register</Link>
                            </>
                        )}
                        <button
                            className={`navbar__hamburger ${mobileOpen ? 'navbar__hamburger--open' : ''}`}
                            onClick={() => setMobileOpen(prev => !prev)}
                            aria-label="Toggle menu"
                            aria-expanded={mobileOpen}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>
            </nav>

            {/*
              * CRITICAL: The mobile menu is rendered OUTSIDE <nav> as a sibling,
              * so it is NOT inside the navbar's stacking context.
              * This means position:fixed + z-index:9999 works correctly.
            */}
            <div
                className={`navbar__mobile-menu ${mobileOpen ? 'navbar__mobile-menu--open' : ''}`}
                aria-hidden={!mobileOpen}
            >
                {/* Nav links */}
                <div className="navbar__mobile-links">
                    {links.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`navbar__mobile-link ${isActive(link.to) ? 'navbar__mobile-link--active' : ''}`}
                            onClick={closeMobile}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Auth section */}
                <div className="navbar__mobile-auth">
                    {user ? (
                        <>
                            <Link
                                to={getDashboardPath()}
                                className="navbar__mobile-link"
                                onClick={closeMobile}
                            >
                                Dashboard
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="btn btn--outline btn--lg"
                                style={{ marginTop: 'var(--space-4)', width: '100%' }}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="navbar__mobile-link"
                                onClick={closeMobile}
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="btn btn--gold btn--lg"
                                style={{ marginTop: 'var(--space-4)', width: '100%', textAlign: 'center' }}
                                onClick={closeMobile}
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

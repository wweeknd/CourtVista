import { useState, useCallback, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './App.css';

// ── Eagerly loaded (small, always needed) ──────────────────────────────────
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import SelectRole from './pages/SelectRole';

// ── Lazy loaded (heavy pages — split into separate chunks) ─────────────────
const Search           = lazy(() => import('./pages/Search'));
const LawyerProfile    = lazy(() => import('./pages/LawyerProfile'));
const Compare          = lazy(() => import('./pages/Compare'));
const BookConsultation = lazy(() => import('./pages/BookConsultation'));
const QnA              = lazy(() => import('./pages/QnA'));
const UserDashboard    = lazy(() => import('./pages/UserDashboard'));
const LawyerDashboard  = lazy(() => import('./pages/LawyerDashboard'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'));
const EditProfile      = lazy(() => import('./pages/EditProfile'));
const ChatList         = lazy(() => import('./pages/ChatList'));
const ChatWindow       = lazy(() => import('./pages/ChatWindow'));

// ── Page-level loading fallback ───────────────────────────────────────────
function PageLoader() {
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
        </div>
    );
}

// ── 404 Not Found page ────────────────────────────────────────────────────
function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '2rem',
        }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>⚖️</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--navy-800)', marginBottom: '0.5rem' }}>
                404 — Page Not Found
            </h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: '2rem', maxWidth: '400px' }}>
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/" className="btn btn--gold">Go Home</Link>
                <Link to="/search" className="btn btn--outline">Find a Lawyer</Link>
            </div>
        </div>
    );
}

function AppContent({ compareIds, handleCompareToggle, handleCompareRemove }) {
    const location = useLocation();

    const hideLayout = ["/login", "/register", "/select-role"].includes(location.pathname);

    return (
        <div id="app">
            {/* Hide Navbar on auth pages */}
            {!hideLayout && <Navbar />}

            <main className="app-main">
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Public routes — eagerly loaded */}
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route path="/select-role" element={<SelectRole />} />

                        {/* Public routes — lazy loaded */}
                        <Route
                            path="/search"
                            element={
                                <Search
                                    compareIds={compareIds}
                                    onCompareToggle={handleCompareToggle}
                                />
                            }
                        />

                        <Route path="/lawyer/:id" element={<LawyerProfile />} />

                        <Route
                            path="/compare"
                            element={
                                <Compare
                                    compareIds={compareIds}
                                    onRemove={handleCompareRemove}
                                />
                            }
                        />

                        <Route path="/book/:id" element={<BookConsultation />} />
                        <Route path="/qna" element={<QnA />} />

                        {/* Protected routes */}
                        <Route
                            path="/dashboard/user"
                            element={
                                <ProtectedRoute allowedRoles={['user']}>
                                    <UserDashboard />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/dashboard/lawyer"
                            element={
                                <ProtectedRoute allowedRoles={['lawyer']}>
                                    <LawyerDashboard />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/dashboard/admin"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Profile */}
                        <Route
                            path="/profile/edit"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'lawyer', 'admin']}>
                                    <EditProfile />
                                </ProtectedRoute>
                            }
                        />

                        {/* Messaging */}
                        <Route
                            path="/messages"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'lawyer']}>
                                    <ChatList />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/messages/:conversationId"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'lawyer']}>
                                    <ChatWindow />
                                </ProtectedRoute>
                            }
                        />

                        {/* 404 catch-all */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </main>

            {/* Hide Footer on auth pages */}
            {!hideLayout && <Footer />}
        </div>
    );
}

export default function App() {
    const [compareIds, setCompareIds] = useState([]);

    const handleCompareToggle = useCallback((id) => {
        setCompareIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((cid) => cid !== id);
            }
            if (prev.length >= 3) {
                // Don't use alert() — return unchanged and let the UI show a toast
                return prev;
            }
            return [...prev, id];
        });
    }, []);

    const handleCompareRemove = useCallback((id) => {
        setCompareIds((prev) => prev.filter((cid) => cid !== id));
    }, []);

    return (
        <Router>
            <AuthProvider>
                <AppContent
                    compareIds={compareIds}
                    handleCompareToggle={handleCompareToggle}
                    handleCompareRemove={handleCompareRemove}
                />
            </AuthProvider>
        </Router>
    );
}
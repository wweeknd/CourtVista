import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./Auth.css";

export default function SelectRole() {
    const { user, updateProfile, completeGoogleSignup, pendingGoogleUser, getDashboardPath } = useAuth();
    const navigate = useNavigate();

    const [selectedRole, setSelectedRole] = useState(null);
    const [loading, setLoading] = useState(false);

    // Get the pending Google user's info to display
    const pendingUser = pendingGoogleUser?.current;

    // If there's no pending Google user AND no logged-in user, redirect to login
    useEffect(() => {
        if (!pendingUser && !user) {
            navigate("/login");
        }
    }, [pendingUser, user, navigate]);

    const handleContinue = async () => {
        if (!selectedRole || loading) return;

        setLoading(true);
        try {
            if (pendingUser) {
                // New Google sign-in — finalize with chosen role
                const result = await completeGoogleSignup(selectedRole);
                if (result.success) {
                    toast.success(`Welcome, ${result.user.name}! You're registered as a ${selectedRole === 'lawyer' ? 'Lawyer' : 'Client'}.`);
                    const path = selectedRole === 'lawyer' ? '/dashboard/lawyer' : '/dashboard/user';
                    navigate(path);
                }
            } else if (user) {
                // Fallback: already logged in but needs role update
                await updateProfile({ role: selectedRole });
                toast.success(`Role set to ${selectedRole === 'lawyer' ? 'Lawyer' : 'Client'}.`);
                const path = selectedRole === 'lawyer' ? '/dashboard/lawyer' : '/dashboard/user';
                navigate(path);
            }
        } catch (err) {
            console.error("Failed to set role:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const displayName = pendingUser?.name || user?.name || "there";
    const displayEmail = pendingUser?.email || user?.email || "";

    return (
        <div className="auth-page">
            <div className="auth-card animate-fade-in-up">
                <div className="auth-card__header">
                    <div className="auth-card__logo">CV</div>
                    <h1 className="auth-card__title">Welcome, {displayName}!</h1>
                    <p className="auth-card__subtitle">
                        How would you like to use CourtVista?
                    </p>
                    {displayEmail && (
                        <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--gray-500, #6b7280)', marginTop: '4px' }}>
                            Signed in as <strong>{displayEmail}</strong>
                        </p>
                    )}
                </div>

                <div className="role-cards">
                    {/* Client */}
                    <div
                        className={`role-card ${selectedRole === "user" ? "active" : ""}`}
                        onClick={() => setSelectedRole("user")}
                    >
                        <div className="role-icon">👤</div>
                        <h3>Client</h3>
                        <p>Find lawyers and book consultations</p>
                    </div>

                    {/* Lawyer */}
                    <div
                        className={`role-card ${selectedRole === "lawyer" ? "active" : ""}`}
                        onClick={() => setSelectedRole("lawyer")}
                    >
                        <div className="role-icon">⚖️</div>
                        <h3>Lawyer</h3>
                        <p>Manage clients and offer services</p>
                    </div>
                </div>

                <button
                    className="btn btn--gold"
                    style={{ width: "100%", marginTop: "20px" }}
                    disabled={!selectedRole || loading}
                    onClick={handleContinue}
                >
                    {loading ? 'Setting up...' : 'Continue'}
                </button>
            </div>
        </div>
    );
}
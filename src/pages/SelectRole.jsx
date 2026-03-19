import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function SelectRole() {
    const { updateProfile, getDashboardPath } = useAuth();
    const navigate = useNavigate();

    const [selectedRole, setSelectedRole] = useState(null);

    const handleContinue = () => {
        if (!selectedRole) return;

        updateProfile({ role: selectedRole });
        navigate(getDashboardPath());
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <h1 className="auth-card__title">Choose Your Role</h1>
                    <p className="auth-card__subtitle">
                        Tell us how you want to use CourtVista
                    </p>
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
                    disabled={!selectedRole}
                    onClick={handleContinue}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
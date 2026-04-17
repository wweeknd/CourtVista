import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lawyers } from '../data/lawyers';
import './Dashboard.css';

import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function AdminDashboard() {
    const { user } = useAuth();

    // Pull real stats from mock data
    const totalLawyers = lawyers.length;
    const totalReviews = lawyers.reduce((sum, l) => sum + l.reviewCount, 0);
    const verifiedLawyers = lawyers.filter((l) => l.verified).length;

    // Count registered users from Firestore
    const [registeredUsers, setRegisteredUsers] = useState(0);
    useEffect(() => {
        async function fetchUserCount() {
            try {
                const snapshot = await getDocs(collection(db, 'users'));
                setRegisteredUsers(snapshot.size);
            } catch (e) {
                console.error('Failed to fetch user count:', e);
            }
        }
        fetchUserCount();
    }, []);

    return (
        <div className="dashboard container">
            <div className="dashboard__header">
                <div className="dashboard__welcome">Admin Panel</div>
                <h1 className="dashboard__title">{user?.name}</h1>
                <span className="dashboard__role-badge dashboard__role-badge--admin">Admin</span>
            </div>

            <div className="dashboard__stats">
                <div className="dashboard__stat-card">
                    <div className="dashboard__stat-icon">👥</div>
                    <div className="dashboard__stat-number">{registeredUsers}</div>
                    <div className="dashboard__stat-label">Registered Users</div>
                </div>
                <div className="dashboard__stat-card">
                    <div className="dashboard__stat-icon">⚖️</div>
                    <div className="dashboard__stat-number">{totalLawyers}</div>
                    <div className="dashboard__stat-label">Lawyers on Platform</div>
                </div>
                <div className="dashboard__stat-card">
                    <div className="dashboard__stat-icon">✅</div>
                    <div className="dashboard__stat-number">{verifiedLawyers}</div>
                    <div className="dashboard__stat-label">Verified Lawyers</div>
                </div>
                <div className="dashboard__stat-card">
                    <div className="dashboard__stat-icon">⭐</div>
                    <div className="dashboard__stat-number">{totalReviews}</div>
                    <div className="dashboard__stat-label">Total Reviews</div>
                </div>
            </div>

            <div className="dashboard__section">
                <h2 className="dashboard__section-title">Admin Actions</h2>
                <div className="dashboard__actions-grid">
                    <Link to="/search" className="dashboard__action-card">
                        <span className="dashboard__action-icon">⚖️</span>
                        <span className="dashboard__action-label">Manage Lawyers</span>
                        <span className="dashboard__action-desc">View all registered lawyers</span>
                    </Link>
                    <Link to="/qna" className="dashboard__action-card">
                        <span className="dashboard__action-icon">💬</span>
                        <span className="dashboard__action-label">Moderate Q&A</span>
                        <span className="dashboard__action-desc">Review questions & answers</span>
                    </Link>
                    <Link to="/" className="dashboard__action-card">
                        <span className="dashboard__action-icon">📊</span>
                        <span className="dashboard__action-label">View Platform</span>
                        <span className="dashboard__action-desc">See the public-facing site</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

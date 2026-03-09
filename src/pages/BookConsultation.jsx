import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDynamicLawyers } from '../context/AuthContext';
import { lawyers, practiceAreas, getInitials } from '../data/lawyers';
import { isUserVerified, initiateEmailVerification, sendBookingConfirmationEmail, sendLawyerNotificationEmail } from '../utils/emailClient';
import AuthModal from '../components/AuthModal';
import './BookConsultation.css';

// Find lawyer across static + dynamic lists
function findLawyer(id) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
        const staticMatch = lawyers.find((l) => l.id === numericId);
        if (staticMatch) return staticMatch;
    }
    const dynamic = getDynamicLawyers();
    return dynamic.find((l) => String(l.id) === String(id)) || null;
}

// Helpers for consultation persistence
function getStoredConsultations() {
    try {
        return JSON.parse(localStorage.getItem('courtvista_consultations')) || [];
    } catch {
        return [];
    }
}

function saveConsultation(consultation) {
    const all = getStoredConsultations();
    all.push(consultation);
    localStorage.setItem('courtvista_consultations', JSON.stringify(all));
}

export default function BookConsultation() {
    const { id } = useParams();
    const { user, refreshUser } = useAuth();
    const lawyer = findLawyer(id);
    const [submitted, setSubmitted] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [resendStatus, setResendStatus] = useState('');
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        caseType: '',
        date: '',
        time: '',
        message: '',
    });

    if (!lawyer) {
        return (
            <div className="book-page container">
                <div className="search-page__no-results">
                    <h3>Lawyer not found</h3>
                    <Link to="/search" className="btn btn--primary" style={{ marginTop: '1rem' }}>
                        Browse Lawyers
                    </Link>
                </div>
            </div>
        );
    }

    const specNames = (lawyer.specializations || [])
        .map((s) => practiceAreas.find((pa) => pa.id === s)?.name)
        .filter(Boolean)
        .join(' · ');

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleResendVerification = async () => {
        if (!user) return;
        setResendStatus('sending');
        await initiateEmailVerification(user.email, user.name);
        setResendStatus('sent');
        setTimeout(() => setResendStatus(''), 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Persist the booking to localStorage
        const consultation = {
            id: 'consult-' + Date.now(),
            lawyerId: lawyer.id,
            lawyerName: lawyer.name,
            clientName: formData.name,
            clientEmail: formData.email.toLowerCase(),
            clientUserId: user?.id || null,
            phone: formData.phone,
            caseType: formData.caseType,
            caseTypeName: practiceAreas.find((pa) => pa.id === formData.caseType)?.name || formData.caseType,
            date: formData.date,
            time: formData.time,
            message: formData.message,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        saveConsultation(consultation);

        // Send notification emails (fire-and-forget — don't block the UI)
        const emailDetails = {
            clientName: formData.name,
            lawyerName: lawyer.name,
            date: formData.date,
            time: formData.time,
            caseType: practiceAreas.find((pa) => pa.id === formData.caseType)?.name || formData.caseType,
            consultationFee: lawyer.consultationFee,
            clientEmail: formData.email.toLowerCase(),
            message: formData.message,
        };

        // Send booking confirmation to client
        sendBookingConfirmationEmail(formData.email.toLowerCase(), emailDetails);

        // Send notification to lawyer (if lawyer has an email — dynamic lawyers have email in user record)
        // For static lawyers, we don't have their email, so skip
        const dynamicLawyers = getDynamicLawyers();
        const dynamicMatch = dynamicLawyers.find((dl) => String(dl.id) === String(lawyer.id));
        if (dynamicMatch) {
            // Get the lawyer's email from stored users
            try {
                const users = JSON.parse(localStorage.getItem('courtvista_users')) || [];
                const lawyerUser = users.find((u) => u.id === lawyer.id);
                if (lawyerUser?.email) {
                    sendLawyerNotificationEmail(lawyerUser.email, emailDetails);
                }
            } catch { /* ignore */ }
        }

        setSubmitted(true);
    };

    // If user is NOT logged in — show auth modal prompt
    if (!user) {
        return (
            <div className="book-page container">
                <div className="book-page__header">
                    <h1 className="book-page__title">Book a Consultation</h1>
                    <p className="book-page__subtitle">Sign in to book a consultation with {lawyer.name}</p>
                </div>

                <div className="book-page__lawyer-summary">
                    <div className="book-page__lawyer-avatar">{getInitials(lawyer.name)}</div>
                    <div>
                        <div className="book-page__lawyer-name">{lawyer.name}</div>
                        <div className="book-page__lawyer-spec">{specNames}</div>
                    </div>
                    <div className="book-page__lawyer-fee">
                        <div className="book-page__lawyer-fee-label">Consultation Fee</div>
                        <div className="book-page__lawyer-fee-value">
                            {lawyer.feesRange || (lawyer.consultationFee ? `₹${lawyer.consultationFee}` : 'Contact for fees')}
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-5)' }}>
                        You need to be logged in to book a consultation.
                    </p>
                    <button
                        className="btn btn--gold btn--lg"
                        onClick={() => setShowAuthModal(true)}
                    >
                        Sign In / Register
                    </button>
                </div>

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => {
                        setShowAuthModal(false);
                        // Refresh to show the booking form
                        window.location.reload();
                    }}
                    message="Sign in to book a consultation"
                />
            </div>
        );
    }

    // If user is logged in but email NOT verified
    if (!isUserVerified(user.email)) {
        return (
            <div className="book-page container">
                <div className="book-page__header">
                    <h1 className="book-page__title">Email Verification Required</h1>
                </div>

                <div className="book-page__lawyer-summary">
                    <div className="book-page__lawyer-avatar">{getInitials(lawyer.name)}</div>
                    <div>
                        <div className="book-page__lawyer-name">{lawyer.name}</div>
                        <div className="book-page__lawyer-spec">{specNames}</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', padding: 'var(--space-8)', maxWidth: '480px', margin: '0 auto' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>
                    <h2 style={{ color: 'var(--navy-800)', marginBottom: 'var(--space-3)' }}>
                        Please verify your email to complete the booking.
                    </h2>
                    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
                        Check your inbox at <strong>{user.email}</strong> for a verification link.
                        Once verified, you can proceed with booking.
                    </p>

                    <button
                        className="btn btn--gold"
                        onClick={handleResendVerification}
                        disabled={resendStatus === 'sending'}
                    >
                        {resendStatus === 'sending' ? 'Sending...' : resendStatus === 'sent' ? '✓ Verification Email Sent!' : 'Resend Verification Email'}
                    </button>

                    <div style={{ marginTop: 'var(--space-5)' }}>
                        <Link to={`/lawyer/${lawyer.id}`} className="btn btn--outline btn--sm">
                            ← Back to Profile
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="book-page container">
                <div className="book-confirmation animate-fade-in-up">
                    <div className="book-confirmation__icon">✅</div>
                    <h2 className="book-confirmation__title">Consultation Request Sent!</h2>
                    <p className="book-confirmation__text">
                        Your consultation request has been sent to {lawyer.name}.
                        They will contact you within 24 hours to confirm the appointment.
                        A confirmation email has been sent to your inbox.
                    </p>
                    <div className="book-confirmation__details">
                        <div className="book-confirmation__detail">
                            <span className="book-confirmation__detail-label">Lawyer</span>
                            <span className="book-confirmation__detail-value">{lawyer.name}</span>
                        </div>
                        <div className="book-confirmation__detail">
                            <span className="book-confirmation__detail-label">Your Name</span>
                            <span className="book-confirmation__detail-value">{formData.name}</span>
                        </div>
                        <div className="book-confirmation__detail">
                            <span className="book-confirmation__detail-label">Email</span>
                            <span className="book-confirmation__detail-value">{formData.email}</span>
                        </div>
                        {formData.date && (
                            <div className="book-confirmation__detail">
                                <span className="book-confirmation__detail-label">Preferred Date</span>
                                <span className="book-confirmation__detail-value">{formData.date}</span>
                            </div>
                        )}
                        {formData.time && (
                            <div className="book-confirmation__detail">
                                <span className="book-confirmation__detail-label">Preferred Time</span>
                                <span className="book-confirmation__detail-value">{formData.time}</span>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <Link to={`/lawyer/${lawyer.id}`} className="btn btn--outline">
                            Back to Profile
                        </Link>
                        <Link to="/" className="btn btn--primary">
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="book-page container">
            <div className="book-page__header">
                <h1 className="book-page__title">Book a Consultation</h1>
                <p className="book-page__subtitle">Fill in your details to request a consultation</p>
            </div>

            <div className="book-page__lawyer-summary">
                <div className="book-page__lawyer-avatar">{getInitials(lawyer.name)}</div>
                <div>
                    <div className="book-page__lawyer-name">{lawyer.name}</div>
                    <div className="book-page__lawyer-spec">{specNames}</div>
                </div>
                <div className="book-page__lawyer-fee">
                    <div className="book-page__lawyer-fee-label">Consultation Fee</div>
                    <div className="book-page__lawyer-fee-value">
                        {lawyer.feesRange || (lawyer.consultationFee ? `₹${lawyer.consultationFee}` : 'Contact for fees')}
                    </div>
                </div>
            </div>

            <form className="book-form" onSubmit={handleSubmit}>
                <div className="book-form__grid">
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Full Name *</label>
                        <input className="form-input" type="text" id="name" name="name"
                            value={formData.name} onChange={handleChange} required placeholder="Enter your full name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address *</label>
                        <input className="form-input" type="email" id="email" name="email"
                            value={formData.email} onChange={handleChange} required placeholder="you@example.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="phone">Phone Number</label>
                        <input className="form-input" type="tel" id="phone" name="phone"
                            value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="caseType">Case Type</label>
                        <select className="form-select" id="caseType" name="caseType"
                            value={formData.caseType} onChange={handleChange}>
                            <option value="">Select a case type</option>
                            {practiceAreas.map((pa) => (
                                <option key={pa.id} value={pa.id}>{pa.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="date">Preferred Date</label>
                        <input className="form-input" type="date" id="date" name="date"
                            value={formData.date} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="time">Preferred Time</label>
                        <select className="form-select" id="time" name="time"
                            value={formData.time} onChange={handleChange}>
                            <option value="">Select a time slot</option>
                            <option value="09:00 - 10:00 AM">09:00 - 10:00 AM</option>
                            <option value="10:00 - 11:00 AM">10:00 - 11:00 AM</option>
                            <option value="11:00 - 12:00 PM">11:00 - 12:00 PM</option>
                            <option value="02:00 - 03:00 PM">02:00 - 03:00 PM</option>
                            <option value="03:00 - 04:00 PM">03:00 - 04:00 PM</option>
                            <option value="04:00 - 05:00 PM">04:00 - 05:00 PM</option>
                            <option value="05:00 - 06:00 PM">05:00 - 06:00 PM</option>
                        </select>
                    </div>
                    <div className="form-group book-form__full">
                        <label className="form-label" htmlFor="message">Brief Description of Your Case</label>
                        <textarea className="form-textarea" id="message" name="message"
                            value={formData.message} onChange={handleChange}
                            placeholder="Describe your legal issue briefly..." rows={4} />
                    </div>
                </div>
                <button type="submit" className="btn btn--gold btn--lg book-form__submit" style={{ width: '100%' }}>
                    Send Consultation Request
                </button>
            </form>
        </div>
    );
}

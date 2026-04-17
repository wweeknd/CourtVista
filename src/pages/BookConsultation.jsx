import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lawyers, practiceAreas, getInitials } from '../data/lawyers';
import { sendBookingConfirmationEmail, sendLawyerNotificationEmail } from '../utils/emailClient';
import AuthModal from '../components/AuthModal';
import toast from 'react-hot-toast';
import './BookConsultation.css';

import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Consultation is now saved directly to Firestore (no localStorage)

export default function BookConsultation() {
    const { id } = useParams();
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [lawyer, setLawyer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        caseType: '',
        date: '',
        time: '',
        message: '',
    });

    // Fetch lawyer from Firestore (same pattern as LawyerProfile.jsx)
    useEffect(() => {
        const fetchLawyer = async () => {
            try {
                // 1. Try Firestore 'lawyers' collection
                const lawyerDocRef = doc(db, "lawyers", id);
                const lawyerDocSnap = await getDoc(lawyerDocRef);

                if (lawyerDocSnap.exists()) {
                    const data = lawyerDocSnap.data();
                    setLawyer({
                        id: lawyerDocSnap.id,
                        ...data,
                        photo: data.profilePicture || data.photo || data.image || '',
                        specializations: typeof data.specializations === 'string'
                            ? data.specializations.split(',').map(s => s.trim()).filter(Boolean)
                            : (Array.isArray(data.specializations) ? data.specializations : []),
                        languages: typeof data.languages === 'string'
                            ? data.languages.split(',').map(s => s.trim()).filter(Boolean)
                            : (Array.isArray(data.languages) ? data.languages : []),
                    });
                    setLoading(false);
                    return;
                }

                // 2. Try Firestore 'users' collection (newly registered lawyers)
                const userDocRef = doc(db, "users", id);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    if (data.role === 'lawyer') {
                        setLawyer({
                            id: userDocSnap.id,
                            name: data.name || 'Unknown',
                            photo: data.profilePicture || data.image || '',
                            gender: data.gender || '',
                            specializations: Array.isArray(data.specializations) ? data.specializations : [],
                            experience: Number(data.experience) || 0,
                            rating: Number(data.rating) || 0,
                            reviewCount: Number(data.reviewCount) || 0,
                            verified: !!data.verified,
                            city: data.city || data.location || '',
                            jurisdiction: data.jurisdiction || '',
                            languages: Array.isArray(data.languages) ? data.languages : [],
                            feesRange: data.feesRange || null,
                            consultationFee: Number(data.consultationFee) || 0,
                            bio: data.bio || '',
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 3. Try static lawyers array (handles both numeric and string IDs)
                const numericId = parseInt(id);
                const staticMatch = lawyers.find((l) => l.id === numericId || String(l.id) === String(id));
                if (staticMatch) {
                    setLawyer({ ...staticMatch, id: String(staticMatch.id) });
                    setLoading(false);
                    return;
                }

                // Not found
                setLoading(false);
            } catch (err) {
                console.error("Error fetching lawyer for booking:", err);
                setLoading(false);
            }
        };

        fetchLawyer();
    }, [id]);

    if (loading) {
        return (
            <div className="book-page container">
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Loading lawyer details...</p>
                </div>
            </div>
        );
    }

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ── Email verification gate ──────────────────────────────────────────
        if (!user?.emailVerified) {
            toast.error('Please verify your email address before booking a consultation.');
            navigate('/verify-email');
            return;
        }

        setSubmitting(true);
        try {
            // Persist the booking to Firestore
            const consultationData = {
                lawyerId: String(lawyer.id),
                lawyerName: lawyer.name,
                clientId: user?.id || null,
                clientName: formData.name,
                clientEmail: formData.email.toLowerCase(),
                phone: formData.phone,
                caseType: formData.caseType,
                caseTypeName: practiceAreas.find((pa) => pa.id === formData.caseType)?.name || formData.caseType,
                date: formData.date,
                time: formData.time,
                message: formData.message,
                status: 'pending',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'consultations'), consultationData);

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

            // Send notification to lawyer if they have an email in Firestore
            try {
                const lawyerUserDoc = await getDoc(doc(db, 'users', String(lawyer.id)));
                if (lawyerUserDoc.exists() && lawyerUserDoc.data().email) {
                    sendLawyerNotificationEmail(lawyerUserDoc.data().email, emailDetails);
                }
            } catch { /* ignore email errors */ }

            setSubmitted(true);
        } catch (err) {
            console.error('Failed to save consultation to Firestore:', err);
            toast.error('Failed to send consultation request. Please try again.');
        } finally {
            setSubmitting(false);
        }
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

    // If user is a lawyer trying to book with themselves — block it
    const isOwnProfile = user && user.role === 'lawyer' && String(user.id) === String(lawyer.id);
    if (isOwnProfile) {
        return (
            <div className="book-page container">
                <div className="book-confirmation animate-fade-in-up">
                    <div className="book-confirmation__icon">⚖️</div>
                    <h2 className="book-confirmation__title">This is Your Profile</h2>
                    <p className="book-confirmation__text">
                        You cannot book a consultation with yourself. This is your own lawyer profile.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 'var(--space-5)' }}>
                        <Link to={`/lawyer/${lawyer.id}`} className="btn btn--outline">
                            ← Back to Profile
                        </Link>
                        <Link to="/dashboard/lawyer" className="btn btn--gold">
                            📊 Go to Dashboard
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
                <button
                    type="submit"
                    className="btn btn--gold btn--lg book-form__submit"
                    style={{ width: '100%' }}
                    disabled={submitting}
                >
                    {submitting ? 'Sending Request…' : 'Send Consultation Request'}
                </button>
            </form>
        </div>
    );
}

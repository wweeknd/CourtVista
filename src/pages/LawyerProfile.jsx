import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { practiceAreas, getInitials } from '../data/lawyers';
import { useAuth } from '../context/AuthContext';
import RatingBadge from '../components/RatingBadge';
import ReviewCard from '../components/ReviewCard';
import './LawyerProfile.css';

import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';


// ── localStorage helpers for user-submitted reviews ──────────────────────────
function getStoredReviews(lawyerId) {
    try {
        return JSON.parse(localStorage.getItem(`courtvista_reviews_${lawyerId}`)) || [];
    } catch {
        return [];
    }
}

function saveReview(lawyerId, review) {
    const existing = getStoredReviews(lawyerId);
    // Remove if this user already reviewed to allow update
    const filtered = existing.filter(r => r.reviewerUserId !== review.reviewerUserId);
    const updated = [review, ...filtered];
    localStorage.setItem(`courtvista_reviews_${lawyerId}`, JSON.stringify(updated));
    // Also trigger storage event for real-time updates across components
    window.dispatchEvent(new Event('storage'));
    return updated;
}

// ── Find a lawyer by ID across both static AND dynamic lists ──────────────────
function findLawyer(id) {
    // Static lawyers have numeric IDs; try integer match first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
        const staticMatch = lawyers.find((l) => l.id === numericId);
        if (staticMatch) return staticMatch;
    }
    // Fallback: match dynamic lawyers by string ID
    const dynamic = getDynamicLawyers();
    return dynamic.find((l) => String(l.id) === String(id)) || null;
}

// ── Star selector component ───────────────────────────────────────────────────
function StarSelector({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    const labels = ['', 'Terrible', 'Poor', 'Below Average', 'Average', 'Okay',
        'Good', 'Very Good', 'Great', 'Excellent', 'Outstanding'];
    return (
        <div className="star-selector">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`star-selector__star ${star <= (hovered || value) ? 'star-selector__star--active' : ''}`}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(star)}
                >
                    ★
                </button>
            ))}
            <span className="star-selector__label">
                {value === 0 ? 'Select rating (1–10)' : `${value}/10 — ${labels[value]}`}
            </span>
        </div>
    );
}

export default function LawyerProfile() {
    const { id } = useParams();
    const { user } = useAuth();

    const [lawyer, setLawyer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── User-submitted reviews ───────────────────────────────────────────────
    const [userReviews, setUserReviews] = useState(() => getStoredReviews(id));
    const [reviewForm, setReviewForm] = useState({ rating: 0, text: '' });
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [reviewError, setReviewError] = useState('');

    // Check if this user already left a review
    const alreadyReviewed = userReviews.some((r) => String(r.reviewerUserId) === String(user?.id));

    //For reviews
    useEffect(() => {
        const reviews = getStoredReviews(id);
        setUserReviews(reviews);
        // Pre-populate if this user already reviewed
        const mine = reviews.find(r => String(r.reviewerUserId) === String(user?.id));
        if (mine) {
            setReviewForm({ rating: mine.rating, text: mine.text });
        } else {
            setReviewForm({ rating: 0, text: '' });
        }
    }, [id, user]);

    //For Firestore
    useEffect(() => {
        const fetchLawyer = async () => {
            try {
                const docRef = doc(db, "lawyers", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    setLawyer({
                        id: docSnap.id,
                        ...data,
                        specializations: data.specializations || [],
                        languages: data.languages || [],
                    });
                } else {
                    setError("Lawyer not found");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load lawyer");
            } finally {
                setLoading(false);
            }
        };

        fetchLawyer();
    }, [id]);

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="spinner"></div>
                <p>Loading lawyer profile...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="profile-error">
                <h3>Error</h3>
                <p>{error}</p>
            </div>
        );
    }
    if (!lawyer) {
        return (
            <div className="profile-not-found">
                <h3>Lawyer not found</h3>
                <p>The lawyer you are looking for does not exist.</p>
            </div>
        );
    }

    // ── Merge static reviews with user-submitted reviews ─────────────────────
    const staticReviews = lawyer.reviews || [];
    const allReviews = [...userReviews, ...staticReviews];

    const specNames = (lawyer.specializations || [])
        .map((s) => practiceAreas.find((pa) => pa.id === s)?.name)
        .filter(Boolean);

    // ── Rating calculation ─────────────────────────────────────────────────────
    // User reviews are on 0–10 scale (matching platform standard).
    // Static reviews use a 1–5 star scale — we do NOT mix them into displayRating.
    const userAvg = userReviews.length
        ? parseFloat((userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1))
        : null;

    // displayRating feeds RatingBadge (0–10). Use live user avg if available, else static.
    const displayRating = userAvg !== null ? userAvg : (lawyer.rating || 0);

    // Summary bar shows breakdown of ALL reviews (10→1).
    // Static reviews (1–5) are scaled to (2, 4, 6, 8, 10) to match platform standard.
    const starCounts = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((star) => {
        const count = allReviews.filter(r => {
            let effectiveRating = r.rating;
            // Scale static 5-star reviews to 10-pt scale
            if (effectiveRating <= 5 && !String(r.id).startsWith('ureview-')) {
                effectiveRating = effectiveRating * 2;
            }
            return effectiveRating === star;
        }).length;

        return {
            star,
            count,
            pct: allReviews.length ? (count / allReviews.length) * 100 : 0,
        };
    });

    // ── Review submission ─────────────────────────────────────────────────────
    const handleReviewSubmit = (e) => {
        e.preventDefault();
        setReviewError('');

        if (!user) {
            setReviewError('You must be logged in to leave a review.');
            return;
        }
        if (user.role === 'lawyer') {
            setReviewError('Lawyers cannot review other lawyers.');
            return;
        }
        if (reviewForm.rating === 0) {
            setReviewError('Please select a star rating.');
            return;
        }
        if (!reviewForm.text.trim() || reviewForm.text.trim().length < 10) {
            setReviewError('Please write at least 10 characters.');
            return;
        }

        const existingMine = userReviews.find(r => String(r.reviewerUserId) === String(user.id));

        const newReview = {
            id: existingMine ? existingMine.id : `ureview-${Date.now()}`,
            reviewer: user.name,
            reviewerUserId: user.id,
            rating: reviewForm.rating,
            text: reviewForm.text.trim(),
            date: new Date().toISOString().split('T')[0],
            helpful: existingMine ? existingMine.helpful : 0,
        };

        const updated = saveReview(id, newReview);
        setUserReviews(updated);
        setReviewForm({ rating: 0, text: '' });
        setReviewSubmitted(true);
    };

    return (
        <div className="profile-page container">
            {/* ─── HEADER ─── */}
            <div className="profile-header animate-fade-in-up">
                <div className="profile-header__avatar" style={{
                    backgroundImage: lawyer.photo ? `url(${lawyer.photo})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: lawyer.photo ? 'transparent' : 'white'
                }}>
                    {!lawyer.photo && (lawyer.name ? getInitials(lawyer.name) : '?')}
                </div>
                <div className="profile-header__info">
                    <h1 className="profile-header__name">{lawyer.name}</h1>
                    <div className="profile-header__specializations">
                        {specNames.length > 0 ? specNames.join(' · ') : 'Legal Professional'}
                    </div>

                    <div className="profile-header__meta">
                        {lawyer.city && <span className="profile-header__meta-item">📍 {lawyer.city}</span>}
                        {lawyer.jurisdiction && <span className="profile-header__meta-item">🏛️ {lawyer.jurisdiction}</span>}
                        {lawyer.experience > 0 && <span className="profile-header__meta-item">⏳ {lawyer.experience} years experience</span>}
                        <span className="profile-header__meta-item">💬 {allReviews.length} reviews</span>
                    </div>

                    <div className="profile-header__badges">
                        {lawyer.verified && (
                            <span className="chip chip--green">✓ Credentials Verified</span>
                        )}
                        {lawyer.isProBono && (
                            <span className="chip chip--blue" title="Pro Bono: free legal services for people who cannot afford legal representation.">
                                🤝 Pro Bono Service
                            </span>
                        )}
                        {lawyer.isDynamic && (
                            <span className="chip chip--gold">🆕 New Member</span>
                        )}
                        {(lawyer.languages || []).map((lang) => (
                            <span key={lang} className="chip">{lang}</span>
                        ))}
                    </div>

                    <div className="profile-header__actions">
                        <Link to={`/book/${lawyer.id}`} className="btn btn--gold">
                            Book a Consultation
                        </Link>
                        {lawyer.phone && (
                            <a href={`tel:${lawyer.phone}`} className="btn btn--outline">
                                📞 Contact
                            </a>
                        )}
                    </div>
                </div>

                <div className="profile-header__rating">
                    <RatingBadge rating={displayRating} />
                </div>
            </div>

            {/* ─── BODY ─── */}
            <div className="profile-body">
                <div className="profile-main">
                    {/* About */}
                    {lawyer.bio && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">About</h2>
                            <p className="profile-bio">{lawyer.bio}</p>
                        </div>
                    )}

                    {/* Case Statistics — only show for static (they have real data) */}
                    {lawyer.totalCases && lawyer.pendingCases && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">Case Statistics</h2>
                            <div className="profile-case-stats">
                                <div className="profile-case-stat">
                                    <div className="profile-case-stat__icon">📁</div>
                                    <div className="profile-case-stat__number">{lawyer.totalCases}</div>
                                    <div className="profile-case-stat__label">Total Cases Handled</div>
                                </div>
                                <div className="profile-case-stat">
                                    <div className="profile-case-stat__icon profile-case-stat__icon--green">✅</div>
                                    <div className="profile-case-stat__number">{lawyer.totalCases - lawyer.pendingCases}</div>
                                    <div className="profile-case-stat__label">Cases Resolved</div>
                                </div>
                                <div className="profile-case-stat">
                                    <div className="profile-case-stat__icon profile-case-stat__icon--amber">⏳</div>
                                    <div className="profile-case-stat__number">{lawyer.pendingCases}</div>
                                    <div className="profile-case-stat__label">Pending Cases</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Practice Areas */}
                    {specNames.length > 0 && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">Practice Areas</h2>
                            <div className="profile-tags">
                                {specNames.map((name) => (
                                    <span key={name} className="chip chip--gold">{name}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Credentials */}
                    {(lawyer.education || lawyer.barCouncilNumber || lawyer.jurisdiction) && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">Credentials</h2>
                            <div className="profile-credentials">
                                {lawyer.education && (
                                    <div className="profile-credential">
                                        <div className="profile-credential__icon">🎓</div>
                                        <div>
                                            <div className="profile-credential__label">Education</div>
                                            <div className="profile-credential__value">{lawyer.education}</div>
                                        </div>
                                    </div>
                                )}
                                {lawyer.barCouncilNumber && (
                                    <div className="profile-credential">
                                        <div className="profile-credential__icon">📋</div>
                                        <div>
                                            <div className="profile-credential__label">Bar Council Registration</div>
                                            <div className="profile-credential__value">{lawyer.barCouncilNumber}</div>
                                        </div>
                                    </div>
                                )}
                                {lawyer.jurisdiction && (
                                    <div className="profile-credential">
                                        <div className="profile-credential__icon">🏛️</div>
                                        <div>
                                            <div className="profile-credential__label">Jurisdiction</div>
                                            <div className="profile-credential__value">{lawyer.jurisdiction}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Awards */}
                    {lawyer.awards && lawyer.awards.length > 0 && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">Awards &amp; Recognition</h2>
                            <div className="profile-awards">
                                {lawyer.awards.map((award, idx) => (
                                    <div key={idx} className="profile-award">
                                        🏆 {award}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Reviews ─── */}
                    <div className="profile-section">
                        <h2 className="profile-section__title">Client Reviews</h2>

                        {allReviews.length > 0 && (
                            <div className="reviews-summary">
                                <div className="reviews-summary__score">
                                    <div className="reviews-summary__number">
                                        {/* Show the platform rating (0-10) */}
                                        {displayRating}
                                    </div>
                                    <div className="reviews-summary__count">out of 10 · {allReviews.length} review{allReviews.length !== 1 ? 's' : ''}</div>
                                </div>
                                <div className="reviews-summary__bars">
                                    {starCounts.map(({ star, count, pct }) => (
                                        <div key={star} className="reviews-summary__bar">
                                            <span>{star}★</span>
                                            <div className="reviews-summary__bar-track">
                                                <div
                                                    className="reviews-summary__bar-fill"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {allReviews.map((review) => (
                            <ReviewCard key={review.id} review={review} />
                        ))}

                        {allReviews.length === 0 && (
                            <p style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
                                No reviews yet. Be the first to leave one!
                            </p>
                        )}

                        {/* ─── Write a Review ─── */}
                        <div className="write-review">
                            <h3 className="write-review__title">⭐ Write a Review</h3>

                            {!user ? (
                                <p className="write-review__login-note">
                                    <Link to="/login">Log in</Link> to leave a review.
                                </p>
                            ) : user.role === 'lawyer' ? (
                                <p className="write-review__login-note">Only clients can submit reviews.</p>
                            ) : alreadyReviewed ? (
                                <p className="write-review__login-note" style={{ color: 'var(--emerald-600)' }}>
                                    ✅ You have already submitted a review. Thank you!
                                </p>
                            ) : reviewSubmitted ? (
                                <div className="write-review__success">
                                    ✅ Thank you! Your review has been published.
                                </div>
                            ) : (
                                <form className="write-review__form" onSubmit={handleReviewSubmit}>
                                    <div className="write-review__field">
                                        <label>Your Rating *</label>
                                        <StarSelector
                                            value={reviewForm.rating}
                                            onChange={(v) => setReviewForm((p) => ({ ...p, rating: v }))}
                                        />
                                    </div>
                                    <div className="write-review__field">
                                        <label htmlFor="review-text">Your Review *</label>
                                        <textarea
                                            id="review-text"
                                            value={reviewForm.text}
                                            onChange={(e) => setReviewForm((p) => ({ ...p, text: e.target.value }))}
                                            placeholder="Share your experience with this lawyer..."
                                            rows={4}
                                        />
                                    </div>
                                    {reviewError && <div className="write-review__error">{reviewError}</div>}
                                    <button type="submit" className="btn btn--gold">
                                        {alreadyReviewed ? 'Update Review' : 'Submit Review'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="profile-sidebar">
                    <div className="profile-section">
                        <h2 className="profile-section__title">Consultation Fees</h2>
                        <div className="profile-sidebar__fees">
                            <div className="profile-sidebar__fee-row">
                                <span className="profile-sidebar__fee-label">Consultation</span>
                                <span className="profile-sidebar__fee-value">
                                    {lawyer.consultationFee
                                        ? `₹${lawyer.consultationFee}`
                                        : '₹500 – ₹3000'}
                                </span>
                            </div>
                        </div>
                        <Link
                            to={`/book/${lawyer.id}`}
                            className="btn btn--gold btn--lg"
                            style={{ width: '100%', marginTop: 'var(--space-5)' }}
                        >
                            Book a Consultation
                        </Link>
                    </div>

                    {(lawyer.languages || []).length > 0 && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">Languages</h2>
                            <div className="profile-tags">
                                {(lawyer.languages || []).map((lang) => (
                                    <span key={lang} className="chip">{lang}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {lawyer.jurisdiction && (
                        <div className="profile-section">
                            <h2 className="profile-section__title">Jurisdiction</h2>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                                {lawyer.jurisdiction}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

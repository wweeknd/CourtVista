import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lawyers, practiceAreas, getInitials } from '../data/lawyers';
import { useAuth } from '../context/AuthContext';
import RatingBadge from '../components/RatingBadge';
import ReviewCard from '../components/ReviewCard';
import './LawyerProfile.css';

import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';


// Reviews are now stored in Firestore 'reviews' collection (no localStorage)

// ── Star selector component ───────────────────────────────────────────────────
function StarSelector({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    const labels = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
    return (
        <div className="star-selector">
            {[1, 2, 3, 4, 5].map((star) => (
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
                {value === 0 ? 'Select rating (1–5)' : `${value}/5 — ${labels[value]}`}
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

    // ── User-submitted reviews (from Firestore) ────────────────────────────────
    const [userReviews, setUserReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: 0, text: '' });
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [reviewError, setReviewError] = useState('');

    // Check if this user already left a review
    const alreadyReviewed = userReviews.some((r) => String(r.reviewerUserId) === String(user?.id));

    // Real-time listener for reviews from Firestore
    useEffect(() => {
        if (!id) return;

        const q = query(
            collection(db, 'reviews'),
            where('lawyerId', '==', id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setUserReviews(reviews);

            // Pre-populate if this user already reviewed
            const mine = reviews.find(r => String(r.reviewerUserId) === String(user?.id));
            if (mine) {
                setReviewForm({ rating: mine.rating, text: mine.text });
            } else {
                setReviewForm({ rating: 0, text: '' });
            }
        });

        return () => unsubscribe();
    }, [id, user?.id]);

    //For Firestore
    useEffect(() => {
        const fetchLawyer = async () => {
            try {
                // 1. Try 'lawyers' collection first
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

                // 2. Fallback: try 'users' collection (newly registered lawyers)
                const userDocRef = doc(db, "users", id);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    if (data.role === 'lawyer') {
                        const languages = data.languages
                            ? (typeof data.languages === 'string'
                                ? data.languages.split(',').map(l => l.trim()).filter(Boolean)
                                : data.languages)
                            : ['English'];
                        const specializations = data.specializations
                            ? (Array.isArray(data.specializations)
                                ? data.specializations
                                : data.specializations.split(',').map(s => s.trim()).filter(Boolean))
                            : [];

                        setLawyer({
                            id: userDocSnap.id,
                            name: data.name || 'Unknown',
                            photo: data.profilePicture || data.image || '',
                            gender: data.gender || '',
                            specializations,
                            experience: Number(data.experience) || 0,
                            rating: Number(data.rating) || 0,
                            reviewCount: Number(data.reviewCount) || 0,
                            verified: !!data.verified,
                            city: data.city || data.location || data.jurisdiction || '',
                            jurisdiction: data.jurisdiction || '',
                            languages,
                            feesRange: data.feesRange || null,
                            consultationFee: Number(data.consultationFee) || 0,
                            education: data.education || '',
                            barCouncilNumber: data.barCouncilNumber || '',
                            bio: data.bio || '',
                            totalCases: 0,
                            pendingCases: 0,
                            awards: data.awards || [],
                            reviews: [],
                            isProBono: !!data.isProBono,
                            isDynamic: true,
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 3. Fallback: try static lawyers array (handles both numeric and string IDs)
                const numericId = parseInt(id);
                const staticMatch = lawyers.find(l => l.id === numericId || String(l.id) === String(id));
                if (staticMatch) {
                    setLawyer({ ...staticMatch, id: String(staticMatch.id) });
                    setLoading(false);
                    return;
                }

                setError("Lawyer not found");
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
    // Normalize Firestore reviews which may use {user, comment} instead of {reviewer, text}
    const staticReviews = (lawyer.reviews || []).map((r, idx) => ({
        id: r.id || `static-${idx}`,
        reviewer: r.reviewer || r.user || 'Anonymous',
        text: r.text || r.comment || '',
        rating: r.rating || 0,
        date: r.date || '',
        helpful: r.helpful || 0,
    }));
    const allReviews = [...userReviews, ...staticReviews];

    const specNames = (lawyer.specializations || [])
        .map((s) => practiceAreas.find((pa) => pa.id === s)?.name)
        .filter(Boolean);

    // ── Rating calculation ─────────────────────────────────────────────────────
    // All ratings are on a 1–5 star scale.
    const userAvg = userReviews.length
        ? parseFloat((userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1))
        : null;

    const displayRating = userAvg !== null ? userAvg : (lawyer.rating || 0);

    // Summary bar shows breakdown of ALL reviews (5→1).
    const starCounts = [5, 4, 3, 2, 1].map((star) => {
        const count = allReviews.filter(r => r.rating === star).length;
        return {
            star,
            count,
            pct: allReviews.length ? (count / allReviews.length) * 100 : 0,
        };
    });

    // ── Review submission (to Firestore) ────────────────────────────────────────
    const handleReviewSubmit = async (e) => {
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

        // Use a deterministic doc ID so the same user can update their review
        const reviewDocId = existingMine?.id || `review_${id}_${user.id}`;

        const reviewData = {
            lawyerId: id,
            lawyerName: lawyer?.name || '',
            reviewer: user.name,
            reviewerUserId: user.id,
            rating: reviewForm.rating,
            text: reviewForm.text.trim(),
            date: new Date().toISOString().split('T')[0],
            helpful: existingMine ? existingMine.helpful : 0,
            updatedAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, 'reviews', reviewDocId), reviewData);
            setReviewForm({ rating: 0, text: '' });
            setReviewSubmitted(true);
        } catch (err) {
            console.error('Failed to save review:', err);
            setReviewError('Failed to submit review. Please try again.');
        }
    };

    // Dynamic experience calculation
    const computedExperience = (() => {
        if (lawyer.experienceStartDate) {
            const start = new Date(lawyer.experienceStartDate);
            const now = new Date();
            return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24 * 365.25)));
        }
        return Number(lawyer.experience) || 0;
    })();

    const displayCity = lawyer.city || lawyer.location || '';

    return (
        <div className="profile-page container">
            {/* ─── HEADER ─── */}
            <div className="profile-header animate-fade-in-up">
                <div className="profile-header__avatar" style={{
                    backgroundImage: (lawyer.photo || lawyer.image) ? `url("${lawyer.photo || lawyer.image}")` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: (lawyer.photo || lawyer.image) ? 'transparent' : 'white'
                }}>
                    {!(lawyer.photo || lawyer.image) && (lawyer.name ? getInitials(lawyer.name) : '?')}
                </div>
                <div className="profile-header__info">
                    <h1 className="profile-header__name">{lawyer.name}</h1>
                    <div className="profile-header__specializations">
                        {specNames.length > 0 ? specNames.join(' · ') : 'Legal Professional'}
                    </div>

                    <div className="profile-header__meta">
                        {displayCity && <span className="profile-header__meta-item">📍 {displayCity}</span>}
                        {lawyer.jurisdiction && <span className="profile-header__meta-item">🏛️ {lawyer.jurisdiction}</span>}
                        {computedExperience > 0 && <span className="profile-header__meta-item">⏳ {computedExperience} years experience</span>}
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
                        {user && user.role === 'lawyer' && String(user.id) === String(lawyer.id) ? (
                            <>
                                <Link to="/profile/edit" className="btn btn--gold">
                                    ✏️ Edit Your Profile
                                </Link>
                                <Link to="/dashboard/lawyer" className="btn btn--outline">
                                    📊 View Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to={`/book/${lawyer.id}`} className="btn btn--gold">
                                    Book a Consultation
                                </Link>
                                {lawyer.phone && (
                                    <a href={`tel:${lawyer.phone}`} className="btn btn--outline">
                                        📞 Contact
                                    </a>
                                )}
                            </>
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
                                        🏆 {typeof award === 'object' ? `${award.title}${award.year ? ` (${award.year})` : ''}` : award}
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
                                    <div className="reviews-summary__count">out of 5 · {allReviews.length} review{allReviews.length !== 1 ? 's' : ''}</div>
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
                        {user && user.role === 'lawyer' && String(user.id) === String(lawyer.id) ? (
                            <Link
                                to="/profile/edit"
                                className="btn btn--gold btn--lg"
                                style={{ width: '100%', marginTop: 'var(--space-5)' }}
                            >
                                ✏️ Edit Your Profile
                            </Link>
                        ) : (
                            <Link
                                to={`/book/${lawyer.id}`}
                                className="btn btn--gold btn--lg"
                                style={{ width: '100%', marginTop: 'var(--space-5)' }}
                            >
                                Book a Consultation
                            </Link>
                        )}
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

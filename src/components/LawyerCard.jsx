import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInitials, practiceAreas } from '../data/lawyers';
import RatingBadge from './RatingBadge';
import './LawyerCard.css';

import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function LawyerCard({ lawyer, onCompareToggle, isCompared = false }) {
    // Real-time Firestore reviews for this lawyer
    const [firestoreReviews, setFirestoreReviews] = useState([]);
    useEffect(() => {
        if (!lawyer?.id) return;
        const q = query(collection(db, 'reviews'), where('lawyerId', '==', String(lawyer.id)));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFirestoreReviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [lawyer?.id]);

    const { realRating, realReviewCount } = useMemo(() => {
        if (firestoreReviews.length === 0) {
            return { realRating: lawyer.rating || 0, realReviewCount: (lawyer.reviewCount || 0) };
        }
        const avg = firestoreReviews.reduce((sum, r) => sum + r.rating, 0) / firestoreReviews.length;
        return {
            realRating: parseFloat(avg.toFixed(1)),
            realReviewCount: firestoreReviews.length + (lawyer.reviewCount || 0)
        };
    }, [lawyer, firestoreReviews]);

    // Dynamic experience from start date
    const displayExperience = (() => {
        if (lawyer.experienceStartDate) {
            const start = new Date(lawyer.experienceStartDate);
            const now = new Date();
            return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24 * 365.25)));
        }
        return Number(lawyer.experience) || 0;
    })();

    const avatarPhoto = lawyer.profilePicture || lawyer.photo || lawyer.image || null;
    const displayName = lawyer.name || 'Legal Professional';
    const initials = getInitials(displayName);

    const specNames = (lawyer.specializations || [])
        .map((s) => practiceAreas.find((pa) => pa.id === s)?.name)
        .filter(Boolean)
        .join(' · ');

    return (
        <div className="lawyer-card animate-fade-in-up">
            <Link to={`/lawyer/${lawyer.id}`} className="lawyer-card__avatar" style={{
                backgroundImage: avatarPhoto ? `url("${avatarPhoto}")` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: avatarPhoto ? 'transparent' : 'white'
            }}>
                {!avatarPhoto && initials}
            </Link>
 
            <div className="lawyer-card__content">
                <div className="lawyer-card__header">
                    <div>
                        <Link to={`/lawyer/${lawyer.id}`} className="lawyer-card__name">
                            {displayName}
                        </Link>
                        <div className="lawyer-card__specializations">{specNames || 'Legal Professional'}</div>
                    </div>
                    <RatingBadge rating={realRating || null} small />
                </div>

                <div className="lawyer-card__meta">
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">📍</span> {lawyer.city || lawyer.location || 'Location N/A'}
                    </span>
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">⏳</span> {displayExperience ? `${displayExperience} yrs exp` : 'Experience N/A'}
                    </span>
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">💬</span> {realReviewCount ? `${realReviewCount} reviews` : 'No reviews yet'}
                    </span>
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">💰</span> {lawyer.feesRange || (lawyer.consultationFee ? `₹${lawyer.consultationFee}` : 'Fee not specified')}
                    </span>
                </div>

                <div className="lawyer-card__badges">
                    {lawyer.verified && (
                        <span className="lawyer-card__verified">✓ Verified</span>
                    )}
                    {lawyer.isProBono && (
                        <span className="lawyer-card__pro-bono" title="Pro Bono: free legal services for people who cannot afford legal representation.">
                            🤝 Pro Bono
                        </span>
                    )}
                    {(Array.isArray(lawyer.languages)
                        ? lawyer.languages
                        : typeof lawyer.languages === 'string'
                            ? lawyer.languages.split(',').map(l => l.trim()).filter(Boolean)
                            : []
                    ).map((lang) => (
                        <span key={lang} className="chip">{lang}</span>
                    ))}
                </div>

                <div className="lawyer-card__actions">
                    <Link to={`/lawyer/${lawyer.id}`} className="btn btn--primary btn--sm">
                        View Profile
                    </Link>
                    <Link to={`/book/${lawyer.id}`} className="btn btn--outline btn--sm">
                        Book Consultation
                    </Link>
                    {onCompareToggle && (
                        <button
                            className={`lawyer-card__compare-toggle ${isCompared ? 'lawyer-card__compare-toggle--active' : ''}`}
                            onClick={() => onCompareToggle(lawyer.id)}
                        >
                            {isCompared ? '✓ Comparing' : '+ Compare'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

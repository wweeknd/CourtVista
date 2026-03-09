import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInitials, practiceAreas } from '../data/lawyers';
import RatingBadge from './RatingBadge';
import './LawyerCard.css';

export default function LawyerCard({ lawyer, onCompareToggle, isCompared = false }) {
    // Listen for storage changes (ratings)
    const [storageVersion, setStorageVersion] = useState(0);
    useEffect(() => {
        const handleStorage = () => setStorageVersion(v => v + 1);
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const { realRating, realReviewCount } = useMemo(() => {
        try {
            const userReviews = JSON.parse(localStorage.getItem(`courtvista_reviews_${lawyer.id}`)) || [];
            if (userReviews.length === 0) {
                return { realRating: lawyer.rating || 0, realReviewCount: (lawyer.reviewCount || 0) };
            }
            const avg = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
            return {
                realRating: parseFloat(avg.toFixed(1)),
                realReviewCount: userReviews.length + (lawyer.reviewCount || 0)
            };
        } catch {
            return { realRating: lawyer.rating || 0, realReviewCount: (lawyer.reviewCount || 0) };
        }
    }, [lawyer, storageVersion]);

    const specNames = (lawyer.specializations || [])
        .map((s) => practiceAreas.find((pa) => pa.id === s)?.name)
        .filter(Boolean)
        .join(' · ');

    return (
        <div className="lawyer-card animate-fade-in-up">
            <Link to={`/lawyer/${lawyer.id}`} className="lawyer-card__avatar" style={{
                backgroundImage: lawyer.photo ? `url(${lawyer.photo})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: lawyer.photo ? 'transparent' : 'white'
            }}>
                {!lawyer.photo && getInitials(lawyer.name)}
            </Link>

            <div className="lawyer-card__content">
                <div className="lawyer-card__header">
                    <div>
                        <Link to={`/lawyer/${lawyer.id}`} className="lawyer-card__name">
                            {lawyer.name}
                        </Link>
                        <div className="lawyer-card__specializations">{specNames || 'Legal Professional'}</div>
                    </div>
                    <RatingBadge rating={realRating} small />
                </div>

                <div className="lawyer-card__meta">
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">📍</span> {lawyer.city || 'Location N/A'}
                    </span>
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">⏳</span> {lawyer.experience || 0} yrs exp
                    </span>
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">💬</span> {realReviewCount} reviews
                    </span>
                    <span className="lawyer-card__meta-item">
                        <span className="lawyer-card__meta-icon">💰</span> {lawyer.feesRange || (lawyer.consultationFee ? `₹${lawyer.consultationFee}` : '—')}
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
                    {lawyer.languages.map((lang) => (
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

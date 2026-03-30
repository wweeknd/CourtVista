import { useState } from 'react';
import './ReviewCard.css';

export default function ReviewCard({ review }) {
    const initials = review.reviewer
        ? review.reviewer.split(' ').map((n) => n[0]).join('').toUpperCase()
        : '??';

    const formatDate = (dateStr) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    };

    const [helpfulCount, setHelpfulCount] = useState(review.helpful || 0);
    const [hasVoted, setHasVoted] = useState(false);

    const handleHelpfulClick = () => {
        if (hasVoted) {
            setHelpfulCount(prev => prev - 1);
            setHasVoted(false);
        } else {
            setHelpfulCount(prev => prev + 1);
            setHasVoted(true);
        }
    };

    return (
        <div className="review-card">
            <div className="review-card__header">
                <div className="review-card__author">
                    <div className="review-card__avatar">{initials}</div>
                    <div>
                        <div className="review-card__name">{review.reviewer}</div>
                        <div className="review-card__date">{formatDate(review.date)}</div>
                    </div>
                </div>
                <div className="review-card__stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            className={`review-card__star ${star <= review.rating ? 'review-card__star--filled' : ''}`}
                        >
                            ★
                        </span>
                    ))}
                </div>
            </div>
            <p className="review-card__text">{review.text}</p>
            <div className="review-card__helpful">
                <button
                    className={`review-card__helpful-btn ${hasVoted ? 'review-card__helpful-btn--active' : ''}`}
                    onClick={handleHelpfulClick}
                >
                    {hasVoted ? '✅ Helpful' : '👍 Helpful'} ({helpfulCount})
                </button>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ReviewForm.css';

export default function ReviewForm({ lawyerId, onReviewSubmit }) {
    const { user } = useAuth();
    const [rating, setRating] = useState(10);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!user) {
        return (
            <div className="review-form-promo">
                <p>Please <Link to="/login">login</Link> to leave a review for this lawyer.</p>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) {
            setError('Please write a comment for your review.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onReviewSubmit({
                reviewer: user.name,
                rating: parseInt(rating),
                text: text.trim(),
            });
            setText('');
            setRating(10);
        } catch (err) {
            setError('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="review-form" onSubmit={handleSubmit}>
            <h3 className="review-form__title">Write a Review</h3>
            <p className="review-form__subtitle">Share your experience to help others choose the right lawyer.</p>

            {error && <div className="review-form__error">{error}</div>}

            <div className="form-group">
                <label className="form-label">Rating (1-10)</label>
                <div className="review-form__rating-selector">
                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                        className="review-form__range"
                    />
                    <div className="review-form__rating-display">
                        <span className="review-form__rating-number">{rating}</span>
                        <span className="review-form__rating-max">/ 10</span>
                    </div>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="review-text">Your Review</label>
                <textarea
                    id="review-text"
                    className="form-input"
                    placeholder="Tell us about the service you received..."
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                />
            </div>

            <button
                type="submit"
                className="btn btn--gold"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Submitting...' : 'Post Review'}
            </button>
        </form>
    );
}

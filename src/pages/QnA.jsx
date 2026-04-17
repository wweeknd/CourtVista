import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { qnaData, practiceAreas, getInitials } from '../data/lawyers';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    getDoc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import './QnA.css';

export default function QnA() {
    const { user, getLawyerProfile } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [questionText, setQuestionText] = useState('');
    const [questionCategory, setQuestionCategory] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [answeringId, setAnsweringId] = useState(null);

    // ── Real-time listener on Firestore 'questions' collection ──────────────
    useEffect(() => {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                if (!snap.empty) {
                    setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                } else {
                    // Seed with static data so the page isn't empty on first load
                    setQuestions(qnaData);
                }
            },
            (err) => {
                console.error('QnA listener error:', err);
                setQuestions(qnaData); // fallback to static
            }
        );
        return () => unsubscribe();
    }, []);

    const filteredQuestions = selectedCategory
        ? questions.filter((q) => q.category === selectedCategory)
        : questions;

    // ── Post a question ──────────────────────────────────────────────────────
    const handleAsk = async (e) => {
        e.preventDefault();
        if (!questionText.trim() || !questionCategory) return;

        // Verification gate
        if (!user) {
            toast.error('Please sign in to post a question.');
            return;
        }
        if (!user.emailVerified) {
            toast.error('Please verify your email before posting a question.');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'questions'), {
                question: questionText,
                category: questionCategory,
                askedBy: user.name,
                askedByUid: user.id,
                date: new Date().toISOString().split('T')[0],
                answers: [],
                createdAt: serverTimestamp(),
            });
            toast.success('Your question has been posted! Lawyers will respond soon.');
            setQuestionText('');
            setQuestionCategory('');
        } catch (err) {
            console.error('Failed to post question:', err);
            toast.error('Failed to post your question. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Post an answer (lawyers only) ────────────────────────────────────────
    const handleAnswer = async (e, questionId) => {
        e.preventDefault();
        const text = e.target.elements.answerText.value;
        if (!text.trim() || !user || user.role !== 'lawyer') return;

        // Verification gate
        if (!user.emailVerified) {
            toast.error('Please verify your email before answering questions.');
            return;
        }

        const profile = getLawyerProfile();
        const lawyerId = profile ? profile.id : user.id;

        setAnsweringId(questionId);
        try {
            const questionRef = doc(db, 'questions', questionId);
            const questionSnap = await getDoc(questionRef);

            if (!questionSnap.exists()) {
                toast.error('Question not found.');
                return;
            }

            const existing = questionSnap.data().answers || [];
            const newAnswer = {
                id: Date.now(),
                lawyerId,
                lawyerName: user.name,
                profilePicture: user.profilePicture || null,
                text,
                date: new Date().toISOString().split('T')[0],
                helpful: 0,
            };

            await updateDoc(questionRef, {
                answers: [...existing, newAnswer],
            });

            toast.success('Your answer has been posted!');
            e.target.reset();
        } catch (err) {
            console.error('Failed to post answer:', err);
            toast.error('Failed to post your answer. Please try again.');
        } finally {
            setAnsweringId(null);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getCategoryName = (catId) => {
        return practiceAreas.find((pa) => pa.id === catId)?.name || catId;
    };

    const getCategoryIcon = (catId) => {
        return practiceAreas.find((pa) => pa.id === catId)?.icon || '❓';
    };

    return (
        <div className="qna-page container">
            <div className="qna-page__header">
                <h1 className="qna-page__title">Legal Q&A</h1>
                <p className="qna-page__subtitle">
                    Get answers to your legal questions from verified lawyers
                </p>
            </div>

            <div className="qna-page__layout">
                <div>
                    {/* Ask Form */}
                    <form className="qna-ask-form" onSubmit={handleAsk}>
                        <h3 className="qna-ask-form__title">Ask a Legal Question</h3>

                        {/* Show verification prompt if signed in but not verified */}
                        {user && !user.emailVerified && (
                            <div className="auth-error" style={{ marginBottom: '1rem' }}>
                                ⚠️ Please{' '}
                                <Link to="/verify-email" style={{ color: 'inherit', fontWeight: 600 }}>
                                    verify your email
                                </Link>{' '}
                                to post questions.
                            </div>
                        )}

                        <div className="qna-ask-form__row">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Type your legal question here..."
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                disabled={submitting}
                            />
                            <select
                                className="form-select"
                                value={questionCategory}
                                onChange={(e) => setQuestionCategory(e.target.value)}
                                disabled={submitting}
                            >
                                <option value="">Category</option>
                                {practiceAreas.map((pa) => (
                                    <option key={pa.id} value={pa.id}>{pa.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="btn btn--primary btn--sm"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting…' : 'Submit Question'}
                        </button>
                    </form>

                    {/* Questions List */}
                    <div className="qna-question-list">
                        {filteredQuestions.map((q) => (
                            <div key={q.id} className="qna-question animate-fade-in-up">
                                <div className="qna-question__header" onClick={() => toggleExpand(q.id)}>
                                    <div className="qna-question__icon">Q</div>
                                    <div>
                                        <div className="qna-question__title">{q.question}</div>
                                        <div className="qna-question__meta">
                                            <span className="chip">
                                                {getCategoryIcon(q.category)} {getCategoryName(q.category)}
                                            </span>
                                            <span>Asked by {q.askedBy}</span>
                                            <span>{q.date}</span>
                                            <span>{(q.answers || []).length} answer{(q.answers || []).length !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                {expandedId === q.id && (
                                    <div className="qna-question__answers">
                                        {(q.answers || []).map((ans) => (
                                            <div key={ans.id} className="qna-answer">
                                                <div className="qna-answer__header">
                                                    <div
                                                        className="qna-answer__avatar"
                                                        style={{
                                                            backgroundImage: ans.profilePicture ? `url(${ans.profilePicture})` : undefined,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                            color: ans.profilePicture ? 'transparent' : 'white',
                                                        }}
                                                    >
                                                        {!ans.profilePicture && getInitials(ans.lawyerName || 'A')}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            to={`/lawyer/${ans.lawyerId}`}
                                                            className="qna-answer__lawyer-name"
                                                        >
                                                            {ans.lawyerName || 'Anonymous Lawyer'}
                                                        </Link>
                                                        <div className="qna-answer__date">{ans.date}</div>
                                                    </div>
                                                </div>
                                                <p className="qna-answer__text">{ans.text}</p>
                                                <div className="qna-answer__helpful">
                                                    👍 {ans.helpful || 0} people found this helpful
                                                </div>
                                            </div>
                                        ))}

                                        {user?.role === 'lawyer' && (
                                            <form className="qna-answer-form" onSubmit={(e) => handleAnswer(e, q.id)}>
                                                <div className="qna-answer-form__avatar">
                                                    {getInitials(user.name)}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                    <textarea
                                                        name="answerText"
                                                        className="form-textarea"
                                                        style={{ minHeight: '80px', flex: 1 }}
                                                        placeholder="Provide your legal advice..."
                                                        required
                                                        disabled={answeringId === q.id}
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="btn btn--gold btn--sm"
                                                        disabled={answeringId === q.id}
                                                    >
                                                        {answeringId === q.id ? 'Posting…' : 'Answer'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div>
                    <div className="qna-categories">
                        <h3 className="qna-categories__title">Categories</h3>
                        <div className="qna-categories__list">
                            <button
                                className={`qna-category-btn ${!selectedCategory ? 'qna-category-btn--active' : ''}`}
                                onClick={() => setSelectedCategory('')}
                            >
                                📋 All Questions
                            </button>
                            {practiceAreas
                                .filter((pa) => qnaData.some((q) => q.category === pa.id))
                                .map((pa) => (
                                    <button
                                        key={pa.id}
                                        className={`qna-category-btn ${selectedCategory === pa.id ? 'qna-category-btn--active' : ''}`}
                                        onClick={() => setSelectedCategory(pa.id)}
                                    >
                                        {pa.icon} {pa.name}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

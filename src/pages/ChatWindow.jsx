import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lawyers, getInitials } from '../data/lawyers';
import './ChatWindow.css';

import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDateSeparator(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ChatWindow() {
    const { conversationId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [consultation, setConsultation] = useState(null);
    const [consultationLoading, setConsultationLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // ── Real-time listener for the consultation document ──
    useEffect(() => {
        if (!conversationId) return;

        const unsubscribe = onSnapshot(
            doc(db, 'consultations', conversationId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setConsultation({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setConsultation(null);
                }
                setConsultationLoading(false);
            },
            (err) => {
                console.error('ChatWindow: consultation listener error:', err);
                setConsultationLoading(false);
            }
        );

        return () => unsubscribe();
    }, [conversationId]);

    // ── Real-time listener for messages in this conversation ──
    useEffect(() => {
        if (!conversationId) return;

        const q = query(
            collection(db, 'messages'),
            where('conversationId', '==', conversationId),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || new Date().toISOString(),
                };
            });
            setMessages(msgs);
        }, (err) => {
            console.error('ChatWindow: messages listener error:', err);
        });

        return () => unsubscribe();
    }, [conversationId]);

    const isLawyer = user?.role === 'lawyer';
    const otherName = isLawyer ? consultation?.clientName : consultation?.lawyerName;
    const lawyerData = !isLawyer
        ? lawyers.find((l) => String(l.id) === String(consultation?.lawyerId))
        : null;

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // ── Send message to Firestore ──
    const handleSend = useCallback(async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !consultation) return;

        const msgData = {
            conversationId,
            senderId: user.id,
            senderName: user.name,
            senderRole: user.role,
            text: newMessage.trim(),
            timestamp: serverTimestamp(),
            read: false,
        };

        setNewMessage('');
        inputRef.current?.focus();

        try {
            await addDoc(collection(db, 'messages'), msgData);
        } catch (err) {
            console.error('Failed to send message:', err);
            alert('Failed to send message. Please try again.');
        }
    }, [newMessage, user, consultation, conversationId]);

    if (consultationLoading) {
        return (
            <div className="chat-window container animate-fade-in-up">
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Loading conversation...</p>
                </div>
            </div>
        );
    }

    if (!consultation) {
        return (
            <div className="chat-window container animate-fade-in-up">
                <div className="chat-window__not-found">
                    <div className="chat-list__empty-icon">🔍</div>
                    <h3>Conversation not found</h3>
                    <p>This conversation may not exist or has been removed.</p>
                    <Link to="/messages" className="btn btn--gold" style={{ marginTop: '1rem' }}>
                        ← Back to Messages
                    </Link>
                </div>
            </div>
        );
    }

    // Group messages by date for separators
    let lastDateStr = '';

    return (
        <div className="chat-window container animate-fade-in-up">
            {/* Header */}
            <div className="chat-window__header">
                <button className="chat-window__back" onClick={() => navigate('/messages')}>
                    ←
                </button>
                <div className={`chat-window__avatar ${!isLawyer ? 'chat-window__avatar--lawyer' : ''}`} style={{
                    backgroundImage: (!isLawyer && lawyerData?.photo) ? `url(${lawyerData.photo})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: (!isLawyer && lawyerData?.photo) ? 'transparent' : 'white'
                }}>
                    {!isLawyer && lawyerData?.photo ? '' : (isLawyer
                        ? (otherName?.charAt(0)?.toUpperCase() || '?')
                        : (lawyerData ? getInitials(lawyerData.name) : '⚖️'))}
                </div>
                <div className="chat-window__header-info">
                    <div className="chat-window__header-name">{otherName}</div>
                    <div className="chat-window__header-meta">
                        {consultation.caseTypeName || 'Consultation'} · {isLawyer ? 'Client' : 'Lawyer'}
                    </div>
                </div>
                {lawyerData && !isLawyer && (
                    <Link to={`/lawyer/${lawyerData.id}`} className="btn btn--outline btn--sm">
                        View Profile
                    </Link>
                )}
            </div>

            {/* Messages area */}
            <div className="chat-window__messages">
                {messages.length === 0 && (
                    <div className="chat-window__start-conversation">
                        <div className="chat-window__start-icon">👋</div>
                        <p>Start the conversation! Say hello to {otherName}.</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    const currentDateStr = formatDateSeparator(msg.timestamp);
                    let showDateSeparator = false;
                    if (currentDateStr !== lastDateStr) {
                        showDateSeparator = true;
                        lastDateStr = currentDateStr;
                    }

                    return (
                        <div key={msg.id}>
                            {showDateSeparator && (
                                <div className="chat-window__date-separator">
                                    <span>{currentDateStr}</span>
                                </div>
                            )}
                            <div className={`chat-window__bubble-row ${isMine ? 'chat-window__bubble-row--mine' : ''}`}>
                                {!isMine && (
                                    <div className="chat-window__bubble-avatar">
                                        {msg.senderName?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <div className={`chat-window__bubble ${isMine ? 'chat-window__bubble--mine' : 'chat-window__bubble--theirs'}`}>
                                    {!isMine && (
                                        <div className="chat-window__bubble-sender">{msg.senderName}</div>
                                    )}
                                    <div className="chat-window__bubble-text">{msg.text}</div>
                                    <div className="chat-window__bubble-time">{formatTime(msg.timestamp)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form className="chat-window__input-area" onSubmit={handleSend}>
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-window__input"
                    placeholder={`Message ${otherName}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    className="chat-window__send-btn"
                    disabled={!newMessage.trim()}
                >
                    Send →
                </button>
            </form>
        </div>
    );
}

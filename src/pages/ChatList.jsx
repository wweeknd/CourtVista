import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lawyers, getInitials } from '../data/lawyers';
import './ChatList.css';

import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export default function ChatList() {
    const { user } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [messagesByConv, setMessagesByConv] = useState({});
    const [loading, setLoading] = useState(true);

    // ── Real-time listener for confirmed consultations involving this user ──
    useEffect(() => {
        if (!user?.id) return;

        const isLawyer = user.role === 'lawyer';
        const fieldName = isLawyer ? 'lawyerId' : 'clientId';

        const q = query(
            collection(db, 'consultations'),
            where(fieldName, '==', user.id),
            where('status', '==', 'confirmed')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const results = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() || d.data().createdAt || new Date().toISOString(),
            }));
            setConsultations(results);
            setLoading(false);
        }, (err) => {
            console.error('ChatList: consultation listener error:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.id, user?.role]);

    // ── Real-time listeners for latest messages per consultation ──
    useEffect(() => {
        if (consultations.length === 0) return;

        const unsubscribers = consultations.map((consultation) => {
            const q = query(
                collection(db, 'messages'),
                where('conversationId', '==', consultation.id),
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            return onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        ...data,
                        timestamp: data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || new Date().toISOString(),
                    };
                });

                setMessagesByConv((prev) => ({
                    ...prev,
                    [consultation.id]: msgs,
                }));
            });
        });

        return () => unsubscribers.forEach((unsub) => unsub());
    }, [consultations]);

    // Build conversations from confirmed consultations
    const conversations = useMemo(() => {
        if (!user) return [];
        const isLawyer = user.role === 'lawyer';

        return consultations.map((consultation) => {
            const convMessages = messagesByConv[consultation.id] || [];
            const lastMessage = convMessages[0] || null;
            const unreadCount = convMessages.filter(
                (m) => m.senderId !== user.id && !m.read
            ).length;

            const otherName = isLawyer ? consultation.clientName : consultation.lawyerName;
            const otherRole = isLawyer ? 'Client' : 'Lawyer';

            return {
                id: consultation.id,
                otherName,
                otherRole,
                caseType: consultation.caseTypeName || 'Consultation',
                lastMessage: lastMessage?.text || 'No messages yet — start the conversation!',
                lastMessageTime: lastMessage?.timestamp || consultation.createdAt,
                unreadCount,
                lawyerId: consultation.lawyerId,
                isLawyer,
            };
        }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    }, [user, consultations, messagesByConv]);

    if (loading) {
        return (
            <div className="chat-list container animate-fade-in-up">
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Loading conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-list container animate-fade-in-up">
            <div className="chat-list__header">
                <h1 className="chat-list__title">💬 Messages</h1>
                <p className="chat-list__subtitle">
                    {user?.role === 'lawyer'
                        ? 'Communicate with your confirmed clients'
                        : 'Chat with your confirmed lawyers'}
                </p>
            </div>

            {conversations.length === 0 ? (
                <div className="chat-list__empty">
                    <div className="chat-list__empty-icon">💬</div>
                    <h3 className="chat-list__empty-title">No conversations yet</h3>
                    <p className="chat-list__empty-text">
                        {user?.role === 'lawyer'
                            ? 'Once you confirm a client consultation, you can chat with them here.'
                            : 'Once a lawyer confirms your consultation, you\'ll be able to chat with them here.'}
                    </p>
                    <Link to={user?.role === 'lawyer' ? '/dashboard/lawyer' : '/search'} className="btn btn--gold" style={{ marginTop: '1rem' }}>
                        {user?.role === 'lawyer' ? 'View Client Requests' : 'Find a Lawyer'}
                    </Link>
                </div>
            ) : (
                <div className="chat-list__conversations">
                    {conversations.map((conv) => {
                        const lawyerData = !conv.isLawyer
                            ? lawyers.find((l) => String(l.id) === String(conv.lawyerId))
                            : null;

                        return (
                            <Link
                                key={conv.id}
                                to={`/messages/${conv.id}`}
                                className="chat-list__item"
                            >
                                <div className={`chat-list__avatar ${conv.isLawyer ? '' : 'chat-list__avatar--lawyer'}`} style={{
                                    backgroundImage: (!conv.isLawyer && lawyerData?.photo) ? `url(${lawyerData.photo})` : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    color: (!conv.isLawyer && lawyerData?.photo) ? 'transparent' : 'white'
                                }}>
                                    {conv.isLawyer
                                        ? (conv.otherName?.charAt(0)?.toUpperCase() || '?')
                                        : (lawyerData?.photo ? '' : (lawyerData ? getInitials(lawyerData.name) : '⚖️'))}
                                </div>
                                <div className="chat-list__info">
                                    <div className="chat-list__name-row">
                                        <span className="chat-list__name">{conv.otherName}</span>
                                        <span className="chat-list__role-tag">{conv.otherRole}</span>
                                    </div>
                                    <div className="chat-list__case">{conv.caseType}</div>
                                    <div className="chat-list__preview">{conv.lastMessage}</div>
                                </div>
                                <div className="chat-list__meta">
                                    <div className="chat-list__time">
                                        {new Date(conv.lastMessageTime).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="chat-list__unread">{conv.unreadCount}</div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

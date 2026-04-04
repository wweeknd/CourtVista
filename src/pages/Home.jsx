import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import LawyerCard from '../components/LawyerCard';
import { practiceAreas } from '../data/lawyers';
import './Home.css';

import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Profiles to hide from public view (case-insensitive match)
const HIDDEN_PROFILES = [
    'harvey specter',
    'harvey reginald specter',
];

export default function Home() {

    const [lawyers, setLawyers] = useState([]);

    useEffect(() => {
        const fetchLawyers = async () => {
            try {
                // 1. Fetch from 'lawyers' collection
                const lawyersSnapshot = await getDocs(collection(db, "lawyers"));
                const lawyersData = lawyersSnapshot.docs.map(doc => {
                    const d = doc.data();
                    const resolvedPhoto = d.profilePicture || d.photo || d.image || '';
                    return {
                        id: doc.id,
                        ...d,
                        profilePicture: resolvedPhoto,
                        photo: resolvedPhoto
                    };
                });

                // 2. Fetch from 'users' collection (newly registered lawyers)
                const usersSnapshot = await getDocs(collection(db, "users"));
                const userLawyers = usersSnapshot.docs
                    .filter(doc => doc.data().role === 'lawyer')
                    .map(doc => {
                        const d = doc.data();
                        const userPhoto = d.profilePicture || d.image || '';
                        return {
                            id: doc.id,
                            name: d.name || 'Unknown',
                            profilePicture: userPhoto,
                            photo: userPhoto,
                            city: d.city || d.location || '',
                            experience: Number(d.experience) || 0,
                            rating: Number(d.rating) || 0,
                            reviewCount: Number(d.reviewCount) || 0,
                            languages: d.languages || ['English'],
                            isDynamic: true,
                        };
                    });

                // De-duplicate (lawyers collection takes precedence)
                const seenIds = new Set();
                const merged = [];
                for (const l of lawyersData) {
                    if (!seenIds.has(l.id)) { seenIds.add(l.id); merged.push(l); }
                }
                for (const l of userLawyers) {
                    if (!seenIds.has(l.id)) { seenIds.add(l.id); merged.push(l); }
                }

                // Filter out hidden profiles
                const visible = merged.filter(l =>
                    !HIDDEN_PROFILES.includes((l.name || '').toLowerCase())
                );

                setLawyers(visible);
            } catch (error) {
                console.error("Error fetching lawyers:", error);
            }
        };

        fetchLawyers();
    }, []);

    // Show first 4 lawyers
    const featuredLawyers = lawyers.slice(0, 4);

    return (
        <div className="home">
            {/* ─── HERO ─── */}
            <section className="hero">
                <div className="hero__content container">
                    <div className="hero__badge">⚖️ India's Trusted Legal Platform</div>
                    <h1 className="hero__title">
                        Find the Right <span>Lawyer</span> for Your Legal Needs
                    </h1>
                    <p className="hero__subtitle">
                        Discover verified legal professionals, compare credentials,
                        and book consultations — all in one place.
                    </p>
                    <div className="hero__search">
                        <SearchBar hero />
                    </div>
                    <div className="hero__trust">
                        <span className="hero__trust-item">✓ 10,000+ Verified Lawyers</span>
                        <span className="hero__trust-item">✓ 50,000+ Consultations</span>
                        <span className="hero__trust-item">✓ Free to Search</span>
                    </div>
                </div>
            </section>

            {/* ─── PRACTICE AREAS ─── */}
            <section className="practice-areas container">
                <div className="section-header">
                    <div className="section-header__label">Browse by Specialization</div>
                    <h2 className="section-header__title">What Legal Help Do You Need?</h2>
                    <p className="section-header__subtitle">
                        Select a practice area to find lawyers who specialize in your type of case
                    </p>
                </div>
                <div className="practice-grid stagger-children">
                    {practiceAreas.map((pa) => (
                        <Link
                            key={pa.id}
                            to={`/search?area=${pa.id}`}
                            className="practice-card animate-fade-in-up"
                        >
                            <span className="practice-card__icon">{pa.icon}</span>
                            <div>
                                <div className="practice-card__name">{pa.name}</div>
                                <div className="practice-card__desc">{pa.description}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ─── FEATURED LAWYERS ─── */}
            <section className="featured container">
                <div className="section-header">
                    <div className="section-header__label">Top Rated</div>
                    <h2 className="section-header__title">Featured Legal Professionals</h2>
                    <p className="section-header__subtitle">
                        Highest-rated lawyers on CourtVista, verified and trusted by thousands
                    </p>
                </div>

                <div className="featured__grid">
                    {featuredLawyers.length === 0 ? (
                        <p>No lawyers found</p>
                    ) : (
                        featuredLawyers.map((lawyer) => (
                            <LawyerCard key={lawyer.id} lawyer={lawyer} />
                        ))
                    )}
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="how-it-works" id="how-it-works">
                <div className="container">
                    <div className="section-header">
                        <div className="section-header__label">Simple Process</div>
                        <h2 className="section-header__title">How CourtVista Works</h2>
                        <p className="section-header__subtitle">
                            Three simple steps to find and connect with the right legal professional
                        </p>
                    </div>
                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-card__number">1</div>
                            <h3 className="step-card__title">Search & Filter</h3>
                            <p className="step-card__text">
                                Search by practice area, location, and experience. Use advanced filters to narrow down your options.
                            </p>
                        </div>
                        <div className="step-card">
                            <div className="step-card__number">2</div>
                            <h3 className="step-card__title">Compare & Evaluate</h3>
                            <p className="step-card__text">
                                Review verified profiles, ratings, and client feedback. Compare lawyers side-by-side to make informed choices.
                            </p>
                        </div>
                        <div className="step-card">
                            <div className="step-card__number">3</div>
                            <h3 className="step-card__title">Book & Connect</h3>
                            <p className="step-card__text">
                                Book a consultation directly through the platform. Get expert legal help without the hassle.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── STATS ─── */}
            <section className="stats">
                <div className="container">
                    <div className="stats__grid">
                        <div>
                            <div className="stat__number">10,000+</div>
                            <div className="stat__label">Verified Lawyers</div>
                        </div>
                        <div>
                            <div className="stat__number">50,000+</div>
                            <div className="stat__label">Consultations Booked</div>
                        </div>
                        <div>
                            <div className="stat__number">15+</div>
                            <div className="stat__label">Practice Areas</div>
                        </div>
                        <div>
                            <div className="stat__number">98%</div>
                            <div className="stat__label">Client Satisfaction</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="cta container">
                <h2 className="cta__title">Ready to Find Your Lawyer?</h2>
                <p className="cta__text">
                    Join thousands who have found the right legal representation through CourtVista.
                </p>
                <div className="cta__actions">
                    <Link to="/search" className="btn btn--gold btn--lg">
                        Find a Lawyer Now
                    </Link>
                    <Link to="/qna" className="btn btn--outline btn--lg">
                        Ask a Legal Question
                    </Link>
                </div>
            </section>
        </div>
    );
}
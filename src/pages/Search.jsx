import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import SearchBar from '../components/SearchBar';
import FilterSidebar from '../components/FilterSidebar';
import LawyerCard from '../components/LawyerCard';
import { getDynamicLawyers } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import './Search.css';

// Profiles to hide from public search results (case-insensitive match)
const HIDDEN_PROFILES = [
    'saul goodman',
    'harvey specter',
    'harvey reginald specter',
];

const ITEMS_PER_PAGE = 6;

export default function Search({ compareIds, onCompareToggle }) {
    const [searchParams] = useSearchParams();

    const initialArea = searchParams.get('area') || '';
    const initialCity = searchParams.get('city') || '';
    const initialName = searchParams.get('name') || '';

    const [allLawyers, setAllLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch from Firestore + merge registered lawyer profiles
    useEffect(() => {
        const fetchLawyers = async () => {
            try {
                // Get localStorage user cache for profilePicture (base64 stored locally, not in Firestore)
                let localUsersCache = [];
                try {
                    localUsersCache = JSON.parse(localStorage.getItem('courtvista_users')) || [];
                } catch { /* ignore */ }

                // 1. Fetch from 'lawyers' collection
                const lawyersSnapshot = await getDocs(collection(db, "lawyers"));

                const firestoreLawyers = lawyersSnapshot.docs.map(doc => {
                    const d = doc.data();
                    // Check localStorage for user-uploaded photo (takes priority over Firestore placeholder)
                    const localUser = localUsersCache.find(u => u.id === doc.id);

                    return {
                        id: doc.id,
                        name: d.name || 'Unknown',
                        city: d.location || '',
                        experience: d.experience || 0,
                        specializations: typeof d.specializations === 'string'
                            ? d.specializations.split(',').map(s => s.trim()).filter(Boolean)
                            : (Array.isArray(d.specializations) ? d.specializations : (
                                d.specialization ? [d.specialization.toLowerCase().replace(" law", "")] : []
                            )),

                        languages: typeof d.languages === 'string'
                            ? d.languages.split(',').map(s => s.trim()).filter(Boolean)
                            : (Array.isArray(d.languages) ? d.languages : []),

                        consultationFee: d.consultationFee || 1000,
                        verified: !!d.verified,
                        isProBono: !!d.isProBono,
                        gender: d.gender || '',

                        photo: localUser?.profilePicture || d.profilePicture || d.image || d.photo || '',

                        rating: d.rating || 0,
                        reviewCount: d.reviewCount || 0,

                        liveRating: d.rating || 0,
                        liveReviewCount: d.reviewCount || 0
                    };
                });

                // 2. Fetch from 'users' collection (newly registered lawyers)
                const usersSnapshot = await getDocs(collection(db, "users"));
                const userLawyers = usersSnapshot.docs
                    .filter(doc => doc.data().role === 'lawyer')
                    .map(doc => {
                        const d = doc.data();
                        const localUser = localUsersCache.find(u => u.id === doc.id);
                        const languages = d.languages
                            ? (typeof d.languages === 'string'
                                ? d.languages.split(',').map(l => l.trim()).filter(Boolean)
                                : d.languages)
                            : ['English'];
                        const specializations = d.specializations
                            ? (Array.isArray(d.specializations)
                                ? d.specializations
                                : d.specializations.split(',').map(s => s.trim()).filter(Boolean))
                            : [];

                        return {
                            id: doc.id,
                            name: d.name || 'Unknown',
                            city: d.city || d.location || d.jurisdiction || '',
                            experience: Number(d.experience) || 0,
                            specializations,
                            languages,
                            consultationFee: Number(d.consultationFee) || 0,
                            verified: !!d.verified,
                            isProBono: !!d.isProBono,
                            gender: d.gender || '',
                            photo: localUser?.profilePicture || d.profilePicture || d.image || '',
                            rating: Number(d.rating) || 0,
                            reviewCount: Number(d.reviewCount) || 0,
                            liveRating: Number(d.rating) || 0,
                            liveReviewCount: Number(d.reviewCount) || 0,
                            isDynamic: true,
                        };
                    });

                // 3. Merge localStorage dynamic lawyers
                const dynamicLawyers = getDynamicLawyers().map(dl => ({
                    ...dl,
                    city: dl.city || '',
                    liveRating: dl.rating || 0,
                    liveReviewCount: dl.reviewCount || 0,
                }));

                // De-duplicate by ID (lawyers collection > users collection > localStorage)
                const seenIds = new Set();
                const merged = [];

                for (const l of firestoreLawyers) {
                    if (!seenIds.has(l.id)) { seenIds.add(l.id); merged.push(l); }
                }
                for (const l of userLawyers) {
                    if (!seenIds.has(l.id)) { seenIds.add(l.id); merged.push(l); }
                }
                for (const l of dynamicLawyers) {
                    if (!seenIds.has(l.id)) { seenIds.add(l.id); merged.push(l); }
                }

                // Filter out hidden profiles
                const visible = merged.filter(l =>
                    !HIDDEN_PROFILES.includes((l.name || '').toLowerCase())
                );

                setAllLawyers(visible);
            } catch (err) {
                console.error("Error fetching lawyers:", err);
                setError("Failed to load lawyers");
            } finally {
                setLoading(false);
            }
        };

        fetchLawyers();
    }, []);

    // Fuse search
    const fuse = useMemo(() => new Fuse(allLawyers, {
        keys: ['name'],
        threshold: 0.2,
        ignoreLocation: true,
    }), [allLawyers]);

    //  Filters
    const [filters, setFilters] = useState({
        areas: initialArea ? [initialArea] : [],
        city: initialCity,
        nameQuery: initialName,
        minExperience: 0,
        minRating: 0,
        languages: [],
        gender: '',
        verifiedOnly: false,
        proBonoOnly: false,
    });

    const [sortBy, setSortBy] = useState('rating');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            areas: [],
            city: '',
            nameQuery: '',
            minExperience: 0,
            minRating: 0,
            languages: [],
            gender: '',
            verifiedOnly: false,
            proBonoOnly: false,
        });
        setCurrentPage(1);
    };

    //  Filtering logic
    const filtered = useMemo(() => {
        let result;

        // Search
        if (filters.nameQuery.trim()) {
            result = fuse.search(filters.nameQuery).map(r => r.item);
        } else {
            result = [...allLawyers];
        }

        // Filters
        if (filters.areas.length > 0) {
            result = result.filter(l =>
                (l.specializations || []).some(s => filters.areas.includes(s))
            );
        }

        if (filters.city) {
            result = result.filter(l =>
                l.city.toLowerCase() === filters.city.toLowerCase()
            );
        }

        if (filters.minExperience) {
            result = result.filter(l => (l.experience || 0) >= filters.minExperience);
        }

        if (filters.minRating) {
            result = result.filter(l => (l.liveRating || 0) >= filters.minRating);
        }

        if (filters.languages.length > 0) {
            result = result.filter(l =>
                filters.languages.some(lang => (l.languages || []).includes(lang))
            );
        }

        if (filters.gender) {
            result = result.filter(l => l.gender === filters.gender);
        }

        if (filters.verifiedOnly) {
            result = result.filter(l => l.verified);
        }

        if (filters.proBonoOnly) {
            result = result.filter(l => l.isProBono);
        }

        // Sorting
        switch (sortBy) {
            case 'rating':
                result.sort((a, b) => (b.liveRating || 0) - (a.liveRating || 0));
                break;
            case 'experience':
                result.sort((a, b) => (b.experience || 0) - (a.experience || 0));
                break;
            case 'reviews':
                result.sort((a, b) => (b.liveReviewCount || 0) - (a.liveReviewCount || 0));
                break;
            case 'fees_low':
                result.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
                break;
            case 'fees_high':
                result.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
                break;
            case 'location':
                result.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
                break;
            default:
                break;
        }

        return result;
    }, [filters, sortBy, allLawyers, fuse]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const paginatedResults = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="search-page container">

            {/* HEADER */}
            <div className="search-page__header">
                <h1 className="search-page__title">Find a Lawyer</h1>
                <div className="search-page__search-wrap">
                    <SearchBar
                        initialArea={initialArea}
                        initialCity={initialCity}
                        initialName={initialName}
                        onNameSearch={(name) => handleFilterChange('nameQuery', name)}
                    />
                </div>
            </div>

            {/* MOBILE FILTER BUTTON */}
            <button
                className="search-page__mobile-filter-btn"
                onClick={() => setShowFilters(!showFilters)}
            >
                {showFilters ? '✕ Hide Filters' : '☰ Show Filters'}
            </button>

            <div className="search-page__layout">

                {/* SIDEBAR */}
                <div className={showFilters
                    ? 'search-page__sidebar'
                    : 'search-page__sidebar search-page__sidebar--hidden'}
                >
                    <FilterSidebar
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClear={handleClearFilters}
                    />
                </div>

                {/* RESULTS */}
                <div className="search-page__results">

                    <div className="search-page__results-header">
                        <div className="search-page__count">
                            Showing <strong>{filtered.length}</strong> lawyer{filtered.length !== 1 ? 's' : ''}
                        </div>

                        <div className="search-page__sort">
                            <span>Sort by:</span>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="rating">Highest Rating</option>
                                <option value="experience">Most Experienced</option>
                                <option value="reviews">Most Reviews</option>
                                <option value="fees_low">Lowest Fees</option>
                                <option value="fees_high">Highest Fees</option>
                                <option value="location">Location (A-Z)</option>
                            </select>
                        </div>
                    </div>

                    {/*  MAIN STATE HANDLING */}
                    {loading ? (
                        <p>Loading lawyers...</p>
                    ) : error ? (
                        <p>{error}</p>
                    ) : paginatedResults.length > 0 ? (
                        <div className="search-page__results-list">
                            {paginatedResults.map((lawyer) => (
                                <LawyerCard
                                    key={lawyer.id}
                                    lawyer={lawyer}
                                    onCompareToggle={onCompareToggle}
                                    isCompared={compareIds.includes(lawyer.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="search-page__no-results">
                            <h3>No lawyers found</h3>
                            <p>Try adjusting your filters</p>
                        </div>
                    )}

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="search-page__pagination">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                            >
                                «
                            </button>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                ‹
                            </button>

                            {(() => {
                                const pages = [];
                                const maxVisible = 5;
                                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                let end = Math.min(totalPages, start + maxVisible - 1);
                                if (end - start < maxVisible - 1) {
                                    start = Math.max(1, end - maxVisible + 1);
                                }

                                if (start > 1) {
                                    pages.push(
                                        <button key={1} onClick={() => setCurrentPage(1)} className="search-page__page-btn">1</button>
                                    );
                                    if (start > 2) pages.push(<span key="dots-start" className="search-page__dots">…</span>);
                                }

                                for (let i = start; i <= end; i++) {
                                    pages.push(
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={`search-page__page-btn ${i === currentPage ? 'search-page__page-btn--active' : ''}`}
                                        >
                                            {i}
                                        </button>
                                    );
                                }

                                if (end < totalPages) {
                                    if (end < totalPages - 1) pages.push(<span key="dots-end" className="search-page__dots">…</span>);
                                    pages.push(
                                        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="search-page__page-btn">{totalPages}</button>
                                    );
                                }

                                return pages;
                            })()}

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                ›
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                            >
                                »
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
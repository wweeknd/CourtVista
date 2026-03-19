import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import SearchBar from '../components/SearchBar';
import FilterSidebar from '../components/FilterSidebar';
import LawyerCard from '../components/LawyerCard';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import './Search.css';

const ITEMS_PER_PAGE = 6;

export default function Search({ compareIds, onCompareToggle }) {
    const [searchParams] = useSearchParams();

    const initialArea = searchParams.get('area') || '';
    const initialCity = searchParams.get('city') || '';
    const initialName = searchParams.get('name') || '';

    const [allLawyers, setAllLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🔥 Fetch from Firestore
    useEffect(() => {
        const fetchLawyers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "lawyers"));

                const data = querySnapshot.docs.map(doc => {
                    const d = doc.data();

                    return {
                        id: doc.id,
                        name: d.name || 'Unknown',
                        city: d.city || '',
                        experience: d.experience || 0,
                        specializations: d.specializations || (d.specialization ? [d.specialization.toLowerCase()] : []),
                        languages: d.languages || [],
                        consultationFee: d.consultationFee || 0,
                        verified: d.verified || false,
                        isProBono: d.isProBono || false,
                        gender: d.gender || '',
                        photo: d.photo || '',
                        rating: d.rating || 0,
                        reviewCount: d.reviewCount || 0,

                        // computed
                        liveRating: d.rating || 0,
                        liveReviewCount: d.reviewCount || 0
                    };
                });

                setAllLawyers(data);
            } catch (err) {
                console.error("Error fetching lawyers:", err);
                setError("Failed to load lawyers");
            } finally {
                setLoading(false);
            }
        };

        fetchLawyers();
    }, []);

    // 🔥 Fuse search
    const fuse = useMemo(() => new Fuse(allLawyers, {
        keys: [
            { name: 'name', weight: 0.7 },
            { name: 'specializations', weight: 0.3 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
    }), [allLawyers]);

    // 🔥 Filters
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

    // 🔥 Filtering logic
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
                (l.city || '').toLowerCase().includes(filters.city.toLowerCase())
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

                    {/* 🔥 MAIN STATE HANDLING */}
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    className={page === currentPage ? 'active' : ''}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
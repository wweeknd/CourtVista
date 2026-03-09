import { useState } from 'react';
import { practiceAreas, cities, languages as allLanguages } from '../data/lawyers';
import './FilterSidebar.css';

const EXPERIENCE_OPTIONS = [
    { value: 0, label: 'Any Experience' },
    { value: 3, label: '3+ years' },
    { value: 5, label: '5+ years' },
    { value: 10, label: '10+ years' },
    { value: 15, label: '15+ years' },
];

const RATING_OPTIONS = [
    { value: 0, label: 'Any Rating' },
    { value: 3, label: '3+ ★' },
    { value: 3.5, label: '3.5+ ★' },
    { value: 4, label: '4+ ★' },
    { value: 4.5, label: '4.5+ ★' },
];

function CollapsibleSection({ title, activeCount, defaultOpen = true, children }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="filter-sidebar__section">
            <button
                className="filter-sidebar__section-header"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="filter-sidebar__section-title">
                    {title}
                    {activeCount > 0 && (
                        <span className="filter-sidebar__count-badge">{activeCount}</span>
                    )}
                </span>
                <span className={`filter-sidebar__chevron ${isOpen ? 'filter-sidebar__chevron--open' : ''}`}>
                    ▾
                </span>
            </button>
            <div
                className={`filter-sidebar__section-body ${isOpen ? 'filter-sidebar__section-body--open' : ''}`}
                aria-hidden={!isOpen}
            >
                {children}
            </div>
        </div>
    );
}

export default function FilterSidebar({ filters, onFilterChange, onClear }) {
    const handleCheckbox = (filterKey, value) => {
        const current = filters[filterKey] || [];
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        onFilterChange(filterKey, next);
    };

    // Count active filters
    const totalActive =
        (filters.areas?.length || 0) +
        (filters.city ? 1 : 0) +
        (filters.minExperience > 0 ? 1 : 0) +
        (filters.minRating > 0 ? 1 : 0) +
        (filters.languages?.length || 0) +
        (filters.gender ? 1 : 0) +
        (filters.verifiedOnly ? 1 : 0) +
        (filters.proBonoOnly ? 1 : 0);

    return (
        <div className="filter-sidebar" role="region" aria-label="Search Filters">
            <div className="filter-sidebar__title">
                <span>
                    Filters
                    {totalActive > 0 && (
                        <span className="filter-sidebar__total-badge">{totalActive}</span>
                    )}
                </span>
                {totalActive > 0 && (
                    <button className="filter-sidebar__clear" onClick={onClear}>
                        Clear All
                    </button>
                )}
            </div>

            {/* Practice Area */}
            <CollapsibleSection
                title="Practice Area"
                activeCount={filters.areas?.length || 0}
                defaultOpen={true}
            >
                <div className="filter-sidebar__options">
                    {practiceAreas.map((pa) => (
                        <label key={pa.id} className="filter-sidebar__option">
                            <input
                                type="checkbox"
                                checked={(filters.areas || []).includes(pa.id)}
                                onChange={() => handleCheckbox('areas', pa.id)}
                            />
                            <span>{pa.icon} {pa.name}</span>
                        </label>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Location */}
            <CollapsibleSection
                title="Location"
                activeCount={filters.city ? 1 : 0}
                defaultOpen={true}
            >
                <select
                    className="filter-sidebar__select"
                    value={filters.city || ''}
                    onChange={(e) => onFilterChange('city', e.target.value)}
                    aria-label="Filter by city"
                >
                    <option value="">All Cities</option>
                    {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </CollapsibleSection>

            {/* Experience */}
            <CollapsibleSection
                title="Experience"
                activeCount={filters.minExperience > 0 ? 1 : 0}
                defaultOpen={false}
            >
                <div className="filter-sidebar__options">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                        <label key={opt.value} className="filter-sidebar__option">
                            <input
                                type="radio"
                                name="minExperience"
                                checked={filters.minExperience === opt.value}
                                onChange={() => onFilterChange('minExperience', opt.value)}
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Rating */}
            <CollapsibleSection
                title="Minimum Rating"
                activeCount={filters.minRating > 0 ? 1 : 0}
                defaultOpen={false}
            >
                <div className="filter-sidebar__options">
                    {RATING_OPTIONS.map((opt) => (
                        <label key={opt.value} className="filter-sidebar__option">
                            <input
                                type="radio"
                                name="minRating"
                                checked={filters.minRating === opt.value}
                                onChange={() => onFilterChange('minRating', opt.value)}
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Languages */}
            <CollapsibleSection
                title="Languages"
                activeCount={filters.languages?.length || 0}
                defaultOpen={false}
            >
                <div className="filter-sidebar__options">
                    {allLanguages.map((lang) => (
                        <label key={lang} className="filter-sidebar__option">
                            <input
                                type="checkbox"
                                checked={(filters.languages || []).includes(lang)}
                                onChange={() => handleCheckbox('languages', lang)}
                            />
                            <span>{lang}</span>
                        </label>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Gender */}
            <CollapsibleSection
                title="Gender"
                activeCount={filters.gender ? 1 : 0}
                defaultOpen={false}
            >
                <div className="filter-sidebar__options">
                    {['', 'Male', 'Female'].map((g) => (
                        <label key={g || 'any'} className="filter-sidebar__option">
                            <input
                                type="radio"
                                name="gender"
                                checked={filters.gender === g}
                                onChange={() => onFilterChange('gender', g)}
                            />
                            <span>{g || 'Any'}</span>
                        </label>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Toggles */}
            <div className="filter-sidebar__section filter-sidebar__section--toggles">
                <div className="filter-sidebar__toggle" role="switch" aria-checked={filters.verifiedOnly}>
                    <span>✓ Verified Only</span>
                    <button
                        className={`filter-sidebar__switch ${filters.verifiedOnly ? 'filter-sidebar__switch--on' : ''}`}
                        onClick={() => onFilterChange('verifiedOnly', !filters.verifiedOnly)}
                        aria-label="Toggle verified only filter"
                    />
                </div>

                <div className="filter-sidebar__toggle" role="switch" aria-checked={filters.proBonoOnly}>
                    <span className="filter-sidebar__pro-bono-label">
                        🤝 Pro Bono Only
                        <span className="filter-sidebar__tooltip-trigger" tabIndex={0}>
                            ℹ️
                            <span className="filter-sidebar__tooltip" role="tooltip">
                                Pro Bono: free legal services for people who cannot afford legal representation.
                            </span>
                        </span>
                    </span>
                    <button
                        className={`filter-sidebar__switch ${filters.proBonoOnly ? 'filter-sidebar__switch--on' : ''}`}
                        onClick={() => onFilterChange('proBonoOnly', !filters.proBonoOnly)}
                        aria-label="Toggle pro bono only filter"
                    />
                </div>
            </div>
        </div>
    );
}

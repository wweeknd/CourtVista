import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceAreas, cities } from '../data/lawyers';
import './SearchBar.css';

export default function SearchBar({ initialArea = '', initialCity = '', initialName = '', onNameSearch, variant = '' }) {
    const navigate = useNavigate();
    const [area, setArea] = useState(initialArea);
    const [city, setCity] = useState(initialCity);
    const [name, setName] = useState(initialName);

    const handleSubmit = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (area) params.set('area', area);
        if (city) params.set('city', city);
        if (name.trim()) params.set('name', name.trim());
        navigate(`/search?${params.toString()}`);

        // Also trigger live name search if handler provided
        if (onNameSearch) {
            onNameSearch(name.trim());
        }
    };

    const handleNameChange = (e) => {
        setName(e.target.value);
        // Live fuzzy search as user types
        if (onNameSearch) {
            onNameSearch(e.target.value);
        }
    };

    return (
        <form className={`search-bar ${variant ? `search-bar--${variant}` : ''}`} onSubmit={handleSubmit}>
            <div className="search-bar__field">
                <span className="search-bar__icon">🔍</span>
                <input
                    type="text"
                    placeholder="Search by name..."
                    value={name}
                    onChange={handleNameChange}
                    aria-label="Search by lawyer name"
                />
            </div>
            <div className="search-bar__field">
                <span className="search-bar__icon">⚖️</span>
                <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Practice area">
                    <option value="">All Practice Areas</option>
                    {practiceAreas.map((pa) => (
                        <option key={pa.id} value={pa.id}>{pa.name}</option>
                    ))}
                </select>
            </div>
            <div className="search-bar__field">
                <span className="search-bar__icon">📍</span>
                <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    list="city-suggestions"
                    aria-label="City"
                />
                <datalist id="city-suggestions">
                    {cities.map((c) => <option key={c} value={c} />)}
                </datalist>
            </div>
            <button type="submit" className="search-bar__submit">
                Search
            </button>
        </form>
    );
}

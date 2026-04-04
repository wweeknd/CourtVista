import { Link } from 'react-router-dom';
import { getInitials, practiceAreas, getRatingColor, getRatingLabel } from '../data/lawyers';
import './CompareTable.css';

export default function CompareTable({ lawyers, onRemove }) {
    if (!lawyers.length) return null;

    const getSpecNames = (specIds) =>
        specIds
            .map((id) => practiceAreas.find((pa) => pa.id === id)?.name)
            .filter(Boolean);

    const rows = [
        {
            label: 'CourtVista Rating',
            render: (l) => {
                let liveRating = Number(l.rating) || 0;
                try {
                    const reviews = JSON.parse(localStorage.getItem(`courtvista_reviews_${l.id}`)) || [];
                    if (reviews.length > 0) {
                        liveRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                    }
                } catch (e) { }

                return (
                    <span style={{ color: getRatingColor(liveRating), fontWeight: 700, fontSize: '1.25rem' }}>
                        {liveRating.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>({getRatingLabel(liveRating)})</span>
                    </span>
                );
            },
        },
        {
            label: 'Experience',
            render: (l) => <span className="compare-table__highlight">{l.experience || 0} years</span>,
        },
        {
            label: 'Specializations',
            render: (l) => (
                <div className="compare-table__chips">
                    {getSpecNames(l.specializations || []).map((n) => (
                        <span key={n} className="chip">{n}</span>
                    ))}
                </div>
            ),
        },
        { label: 'Jurisdiction', render: (l) => l.jurisdiction || 'N/A' },
        { label: 'Fees', render: (l) => <span className="compare-table__highlight">{l.feesRange || (l.consultationFee ? `₹${l.consultationFee}` : '—')}</span> },
        {
            label: 'Reviews',
            render: (l) => {
                let count = Number(l.reviewCount) || 0;
                try {
                    const reviews = JSON.parse(localStorage.getItem(`courtvista_reviews_${l.id}`)) || [];
                    count += reviews.length;
                } catch (e) { }
                return `${count} reviews`;
            }
        },
        {
            label: 'Languages',
            render: (l) => (
                <div className="compare-table__chips">
                    {(Array.isArray(l.languages) ? l.languages : (l.languages?.split(',') || [])).map((lang) => (
                        <span key={lang} className="chip">{lang.trim()}</span>
                    ))}
                </div>
            ),
        },
        { label: 'Verified', render: (l) => l.verified ? <span className="chip chip--green">✓ Verified</span> : <span className="chip">Not Verified</span> },
        { label: 'Education', render: (l) => l.education },
        {
            label: '',
            render: (l) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/lawyer/${l.id}`} className="btn btn--primary btn--sm">View Profile</Link>
                    <Link to={`/book/${l.id}`} className="btn btn--gold btn--sm">Book</Link>
                </div>
            ),
        },
    ];

    return (
        <div className="compare-table-wrapper">
            <table className="compare-table">
                <thead>
                    <tr>
                        <th></th>
                        {lawyers.map((l) => (
                            <th key={l.id} className="compare-table__header-cell">
                                <div className="compare-table__avatar" style={{
                                    backgroundImage: (l.profilePicture || l.photo) ? `url("${l.profilePicture || l.photo}")` : undefined,
                                    color: (l.profilePicture || l.photo) ? 'transparent' : 'white'
                                }}>
                                    {!(l.profilePicture || l.photo) && getInitials(l.name)}
                                </div>
                                <div className="compare-table__name">{l.name}</div>
                                <div className="compare-table__city">📍 {l.city}</div>
                                <button className="compare-table__remove" onClick={() => onRemove(l.id)}>
                                    ✕ Remove
                                </button>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i}>
                            <th>{row.label}</th>
                            {lawyers.map((l) => (
                                <td key={l.id}>{row.render(l)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

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
                const liveRating = Number(l.rating) || 0;
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
                const count = Number(l.reviewCount) || 0;
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
                                <div className="compare-table__avatar">
                                    {(l.photo || l.profilePicture) ? (
                                        <img
                                            src={l.photo || l.profilePicture}
                                            alt={l.name}
                                            className="compare-table__avatar-img"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <span className="compare-table__avatar-initials" style={{ display: (l.photo || l.profilePicture) ? 'none' : 'flex' }}>
                                        {getInitials(l.name)}
                                    </span>
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

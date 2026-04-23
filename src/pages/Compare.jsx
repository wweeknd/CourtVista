import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import CompareTable from '../components/CompareTable';
import './Compare.css';

export default function Compare({ compareIds, onRemove }) {
    const [compareLawyers, setCompareLawyers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (compareIds.length === 0) {
            setCompareLawyers([]);
            return;
        }

        const fetchCompared = async () => {
            setLoading(true);
            try {
                const results = await Promise.all(
                    compareIds.map(async (id) => {
                        const docRef = doc(db, "lawyers", id);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            const d = docSnap.data();

                            // Map Firestore specialization string → practiceArea id
                            const specMap = {
                                'criminal law': 'criminal', 'criminal': 'criminal',
                                'family law': 'family', 'family': 'family',
                                'corporate law': 'corporate', 'corporate': 'corporate',
                                'property law': 'property', 'property': 'property',
                                'real estate law': 'property', 'real estate': 'property',
                                'tax law': 'tax', 'tax': 'tax',
                                'labour law': 'labor', 'labor law': 'labor', 'labor': 'labor',
                                'civil law': 'civil', 'civil': 'civil',
                                'intellectual property': 'ip', 'ip law': 'ip', 'ip': 'ip',
                                'immigration law': 'immigration', 'immigration': 'immigration',
                                'consumer law': 'consumer', 'consumer protection': 'consumer',
                                'banking law': 'banking', 'banking & finance': 'banking', 'banking': 'banking',
                                'cyber law': 'cyber', 'cyber': 'cyber',
                            };

                            const rawSpec = (d.specialization || '').toLowerCase().trim();
                            const specId = specMap[rawSpec] || rawSpec;

                            return {
                                id: docSnap.id,
                                name: d.name || 'Unknown',
                                city: d.location || d.city || '',
                                experience: d.experience || 0,
                                specializations: specId ? [specId] : [],
                                languages: Array.isArray(d.languages) ? d.languages : (d.languages ? d.languages.split(',').map(s => s.trim()) : []),
                                consultationFee: d.consultationFee || 1000,
                                feesRange: d.feesRange || null,
                                verified: !!d.verified,
                                isProBono: !!d.isProBono,
                                gender: d.gender || '',
                                photo: d.image || d.photo || d.profilePicture || '',
                                rating: d.rating || 0,
                                reviewCount: d.reviewCount || d.reviews?.length || 0,
                                education: d.education || '',
                                jurisdiction: d.jurisdiction || '',
                            };
                        }
                        return null;
                    })
                );
                setCompareLawyers(results.filter(Boolean));
            } catch (err) {
                console.error("Error fetching compare lawyers:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCompared();
    }, [compareIds]);

    return (
        <div className="compare-page container">
            <h1 className="compare-page__title">Compare Lawyers</h1>
            <p className="compare-page__subtitle">
                Compare up to 3 lawyers side-by-side to make an informed decision
            </p>

            {loading ? (
                <p>Loading comparison...</p>
            ) : compareLawyers.length > 0 ? (
                <CompareTable lawyers={compareLawyers} onRemove={onRemove} />
            ) : (
                <div className="compare-page__empty">
                    <div className="compare-page__empty-icon">📊</div>
                    <h3>No lawyers selected for comparison</h3>
                    <p>
                        Go to the search page and click the &ldquo;+ Compare&rdquo; button on lawyer cards
                        to add them to your comparison list.
                    </p>
                    <Link to="/search" className="btn btn--gold">
                        Find Lawyers to Compare
                    </Link>
                </div>
            )}
        </div>
    );
}

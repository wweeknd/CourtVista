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
                            return {
                                id: docSnap.id,
                                name: d.name || 'Unknown',
                                city: d.location || '',
                                experience: d.experience || 0,
                                specializations: d.specialization
                                    ? [d.specialization.toLowerCase().replace(" law", "")]
                                    : [],
                                languages: d.languages || [],
                                consultationFee: d.consultationFee || 1000,
                                verified: !!d.verified,
                                isProBono: !!d.isProBono,
                                gender: d.gender || '',
                                photo: d.image || '',
                                rating: d.rating || 0,
                                reviewCount: d.reviewCount || 0,
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

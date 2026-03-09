import { lawyers as staticLawyers } from '../data/lawyers';

const STORAGE_KEY = 'courtvista_extended_lawyers';

/**
 * Get all lawyers, merging static and local data.
 * Scales 5-star ratings to 10-point scale for consistency.
 */
export function getAllLawyers() {
    let localLawyers = [];
    try {
        localLawyers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        console.error("Error reading lawyers from localStorage", e);
    }

    // Merge static and local
    const all = [...staticLawyers, ...localLawyers];

    // Ensure all lawyers have a 10-point rating and necessary fields
    return all.map(lawyer => {
        // If rating is <= 5, assume it's on a 5-point scale and double it
        let rating = lawyer.rating;
        if (rating <= 5) rating = rating * 2;

        return {
            ...lawyer,
            rating: parseFloat(rating.toFixed(1)),
            reviews: lawyer.reviews || [],
            specializations: lawyer.specializations || [],
            languages: lawyer.languages || [],
            awards: lawyer.awards || []
        };
    });
}

/**
 * Get a single lawyer by ID (supports string and numeric IDs)
 */
export function getLawyerById(id) {
    const lawyers = getAllLawyers();
    return lawyers.find(l => l.id.toString() === id.toString());
}

/**
 * Add a review to a lawyer and update their average rating
 */
export function addReview(lawyerId, review) {
    const lawyers = getAllLawyers();
    const staticIds = new Set(staticLawyers.map(l => l.id.toString()));

    let targetLawyer = lawyers.find(l => l.id.toString() === lawyerId.toString());
    if (!targetLawyer) return { success: false, message: 'Lawyer not found' };

    // New review
    const newReview = {
        id: 'rev-' + Date.now(),
        ...review,
        date: new Date().toISOString().split('T')[0],
        helpful: 0
    };

    targetLawyer.reviews = [newReview, ...targetLawyer.reviews];

    // Recalculate rating (out of 10)
    const totalRating = targetLawyer.reviews.reduce((sum, r) => sum + r.rating, 0);
    targetLawyer.rating = parseFloat((totalRating / targetLawyer.reviews.length).toFixed(1));
    targetLawyer.reviewCount = targetLawyer.reviews.length;

    // Persist to localStorage
    const localLawyers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    if (staticIds.has(lawyerId.toString())) {
        // It's a static lawyer, we need to save the override in localLawyers
        const existingIdx = localLawyers.findIndex(l => l.id.toString() === lawyerId.toString());
        if (existingIdx > -1) {
            localLawyers[existingIdx] = targetLawyer;
        } else {
            localLawyers.push(targetLawyer);
        }
    } else {
        // It's already a local lawyer
        const idx = localLawyers.findIndex(l => l.id.toString() === lawyerId.toString());
        if (idx > -1) {
            localLawyers[idx] = targetLawyer;
        } else {
            localLawyers.push(targetLawyer);
        }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(localLawyers));
    return { success: true, lawyer: targetLawyer };
}

/**
 * Add or update a lawyer profile (used during signup)
 */
export function upsertLawyer(lawyerData) {
    const localLawyers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const idx = localLawyers.findIndex(l => l.id.toString() === lawyerData.id.toString());

    if (idx > -1) {
        localLawyers[idx] = { ...localLawyers[idx], ...lawyerData };
    } else {
        localLawyers.push({
            ...lawyerData,
            rating: 0,
            reviewCount: 0,
            reviews: [],
            verified: false,
            specializations: lawyerData.specializations || ['civil'],
            experience: lawyerData.experience || 0,
            city: lawyerData.city || 'Unknown',
            jurisdiction: lawyerData.jurisdiction || 'Local Court',
            languages: lawyerData.languages || ['English'],
            feesRange: '₹1,000 – ₹5,000',
            consultationFee: 1000,
            education: lawyerData.education || 'LL.B.',
            barCouncilNumber: lawyerData.barCouncilNumber || 'Pending',
            bio: lawyerData.bio || 'Professional legal services.',
            totalCases: 0,
            pendingCases: 0,
            awards: []
        });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(localLawyers));
}

/**
 * Upload the resized profile photos (matt_small.jpg and saul_small.jpg) 
 * as base64 data URIs to Firestore.
 * These are only ~5KB each so well within Firestore's 1MB limit.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// Reviews for Matt Murdock
const MATT_REVIEWS = [
    { user: 'Karen Page', comment: 'Matt was incredible in handling my wrongful termination case. He really fights for the little guy and his dedication is unmatched.', rating: 5, date: '2025-11-15' },
    { user: 'Foggy Nelson', comment: 'Known Matt for years. Best criminal defense attorney you could ask for. Thorough, passionate, and truly cares about justice.', rating: 5, date: '2025-09-22' },
    { user: 'Brett Mahoney', comment: 'Professional and well-prepared. The case was complex but Mr. Murdock navigated it expertly. Fair consultation fees too.', rating: 4, date: '2025-07-10' },
    { user: 'Priya Kapoor', comment: 'Very thorough consultation. He listened carefully and gave clear, honest advice about my options. Would recommend.', rating: 4, date: '2026-01-05' },
    { user: 'Rajesh Nair', comment: 'Excellent lawyer. Handled my property dispute efficiently and the outcome exceeded my expectations.', rating: 5, date: '2026-02-18' }
];

// Reviews for Saul Goodman
const SAUL_REVIEWS = [
    { user: 'Jessica Patel', comment: 'Very creative legal strategies. Saul found angles that other lawyers completely missed. My case was resolved favorably.', rating: 5, date: '2025-12-01' },
    { user: 'Amit Sharma', comment: 'Accessible and responsive. Always answered my calls and kept me updated. Good results on my business dispute.', rating: 4, date: '2025-10-14' },
    { user: 'Neha Gupta', comment: 'Saul is unconventional but effective. He resolved my consumer complaint in record time. Definitely knows the system.', rating: 4, date: '2026-01-20' },
    { user: 'Vikram Mehta', comment: 'Great with corporate matters. Helped us draft contracts and handle a tricky partnership dissolution smoothly.', rating: 5, date: '2025-08-30' }
];

async function main() {
    // Read resized images
    const mattB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'matt_small.jpg')).toString('base64');
    const saulB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'saul_small.jpg')).toString('base64');

    console.log('Matt base64:', mattB64.length, 'chars');
    console.log('Saul base64:', saulB64.length, 'chars');

    // Find profiles
    const usersSnap = await db.collection('users').get();
    let mattId = null, saulId = null;
    usersSnap.forEach(doc => {
        const name = (doc.data().name || '').toLowerCase();
        if (name.includes('matt murdock')) mattId = doc.id;
        if (name.includes('saul goodman')) saulId = doc.id;
    });
    console.log('Matt:', mattId, '| Saul:', saulId);

    // Full update for Matt
    if (mattId) {
        const matt = {
            name: 'Matt Murdock',
            role: 'lawyer',
            profilePicture: mattB64,
            image: mattB64,
            city: 'Hyderabad',
            jurisdiction: 'Telangana High Court',
            bio: 'Experienced criminal defense attorney with a passion for justice. Specializing in defending the wrongfully accused and handling complex civil litigation.',
            specializations: ['criminal_defense', 'civil_litigation'],
            experience: 12,
            consultationFee: 2000,
            feesRange: '₹1500 - ₹3000',
            languages: ['English', 'Hindi', 'Telugu'],
            education: 'National Law University, Hyderabad',
            barCouncilNumber: 'TS/1847/2014',
            verified: true,
            isProBono: true,
            gender: 'Male',
            rating: 4.6,
            reviewCount: 5,
            totalCases: 347,
            pendingCases: 12,
            reviews: MATT_REVIEWS,
            awards: [
                { title: 'Pro Bono Excellence Award', year: 2023 },
                { title: 'Best Criminal Defense Lawyer - Hyderabad', year: 2024 }
            ],
            updatedAt: new Date()
        };
        await db.collection('users').doc(mattId).set(matt, { merge: true });
        await db.collection('lawyers').doc(mattId).set(matt, { merge: true });
        console.log('Matt Murdock fully updated!');
    }

    // Full update for Saul
    if (saulId) {
        const saul = {
            name: 'Saul Goodman',
            role: 'lawyer',
            profilePicture: saulB64,
            image: saulB64,
            city: 'Mumbai',
            jurisdiction: 'Bombay High Court',
            bio: 'Creative and results-driven lawyer specializing in corporate law and consumer protection. Known for innovative legal solutions.',
            specializations: ['corporate_law', 'consumer_protection'],
            experience: 8,
            consultationFee: 1500,
            feesRange: '₹1000 - ₹2500',
            languages: ['English', 'Hindi', 'Marathi'],
            education: 'Government Law College, Mumbai',
            barCouncilNumber: 'MH/3291/2018',
            verified: true,
            isProBono: false,
            gender: 'Male',
            rating: 4.3,
            reviewCount: 4,
            totalCases: 215,
            pendingCases: 8,
            reviews: SAUL_REVIEWS,
            awards: [{ title: 'Rising Star in Corporate Law', year: 2024 }],
            updatedAt: new Date()
        };
        await db.collection('users').doc(saulId).set(saul, { merge: true });
        await db.collection('lawyers').doc(saulId).set(saul, { merge: true });
        console.log('Saul Goodman fully updated!');
    }

    // Verify
    for (const [id, name] of [[mattId, 'Matt'], [saulId, 'Saul']]) {
        if (!id) continue;
        const d = (await db.collection('lawyers').doc(id).get()).data();
        console.log(`${name}: photo=${d.profilePicture ? 'SET ('+d.profilePicture.length+' chars)' : 'MISSING'} | cases=${d.totalCases} | reviews=${d.reviewCount} | rating=${d.rating}`);
    }

    console.log('\nALL DONE! Photos + reviews + stats saved to Firestore.');
    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

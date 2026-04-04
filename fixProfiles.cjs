const admin = require('firebase-admin');
const https = require('https');
const path = require('path');
const fs = require('fs');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'courtvista-c553a.appspot.com'
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ── Images: Charlie Cox as Matt Murdock, Bob Odenkirk as Saul Goodman ──
// We'll read the images provided by the user from disk
const MATT_IMG_PATH = path.join(__dirname, 'matt_murdock_photo.jpg');
const SAUL_IMG_PATH = path.join(__dirname, 'saul_goodman_photo.jpg');

// Download fallback URLs (in case local files don't exist)
// These are Wikimedia Commons images that are properly licensed for embedding
const MATT_FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Charlie_Cox_by_Gage_Skidmore.jpg/440px-Charlie_Cox_by_Gage_Skidmore.jpg';
const SAUL_FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Bob_Odenkirk_by_Gage_Skidmore.jpg/440px-Bob_Odenkirk_by_Gage_Skidmore.jpg';

function downloadUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadUrl(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function uploadPhoto(localPath, fallbackUrl, storagePath) {
    let buffer;

    // Try local file first
    if (fs.existsSync(localPath)) {
        console.log(`  Reading from disk: ${localPath}`);
        buffer = fs.readFileSync(localPath);
    } else {
        console.log(`  Local file not found, downloading from: ${fallbackUrl}`);
        buffer = await downloadUrl(fallbackUrl);
    }

    console.log(`  Buffer size: ${buffer.length} bytes`);

    const file = bucket.file(storagePath);
    await file.save(buffer, {
        metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Make public
    try {
        await file.makePublic();
        console.log('  Made file public');
    } catch (e) {
        console.log('  makePublic note:', e.message);
    }

    // Get the download URL (using the GCS public URL format)
    // For Firebase Storage, the format that always works is:
    // https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/{ENCODED_PATH}?alt=media
    const encodedPath = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    console.log(`  URL: ${url}`);
    return url;
}

// Reviews
const MATT_REVIEWS = [
    { user: 'Karen Page', comment: 'Matt was incredible in handling my wrongful termination case. He really fights for the little guy and his dedication is unmatched.', rating: 5, date: '2025-11-15' },
    { user: 'Foggy Nelson', comment: 'Known Matt for years. Best criminal defense attorney you could ask for. Thorough, passionate, and truly cares about justice.', rating: 5, date: '2025-09-22' },
    { user: 'Brett Mahoney', comment: 'Professional and well-prepared. The case was complex but Mr. Murdock navigated it expertly. Fair consultation fees too.', rating: 4, date: '2025-07-10' },
    { user: 'Priya Kapoor', comment: 'Very thorough consultation. He listened carefully and gave clear, honest advice about my options. Would recommend.', rating: 4, date: '2026-01-05' },
    { user: 'Rajesh Nair', comment: 'Excellent lawyer. Handled my property dispute efficiently and the outcome exceeded my expectations.', rating: 5, date: '2026-02-18' }
];

const SAUL_REVIEWS = [
    { user: 'Jessica Patel', comment: 'Very creative legal strategies. Saul found angles that other lawyers completely missed. My case was resolved favorably.', rating: 5, date: '2025-12-01' },
    { user: 'Amit Sharma', comment: 'Accessible and responsive. Always answered my calls and kept me updated. Good results on my business dispute.', rating: 4, date: '2025-10-14' },
    { user: 'Neha Gupta', comment: 'Saul is unconventional but effective. He resolved my consumer complaint in record time. Definitely knows the system.', rating: 4, date: '2026-01-20' },
    { user: 'Vikram Mehta', comment: 'Great with corporate matters. Helped us draft contracts and handle a tricky partnership dissolution smoothly.', rating: 5, date: '2025-08-30' }
];

async function main() {
    console.log('\nFinding profiles...\n');

    const usersSnapshot = await db.collection('users').get();
    let mattId = null, saulId = null;

    usersSnapshot.forEach(doc => {
        const name = (doc.data().name || '').toLowerCase();
        if (name.includes('matt murdock')) { mattId = doc.id; console.log('Found Matt:', doc.id); }
        if (name.includes('saul goodman')) { saulId = doc.id; console.log('Found Saul:', doc.id); }
    });

    // Upload photos
    console.log('\nUploading photos to Firebase Storage...\n');

    let mattUrl = null, saulUrl = null;

    if (mattId) {
        try {
            mattUrl = await uploadPhoto(MATT_IMG_PATH, MATT_FALLBACK, `profile-pictures/${mattId}.jpg`);
            console.log('Matt photo uploaded!\n');
        } catch (err) {
            console.error('Matt upload failed:', err.message);
        }
    }

    if (saulId) {
        try {
            saulUrl = await uploadPhoto(SAUL_IMG_PATH, SAUL_FALLBACK, `profile-pictures/${saulId}.jpg`);
            console.log('Saul photo uploaded!\n');
        } catch (err) {
            console.error('Saul upload failed:', err.message);
        }
    }

    // Update Matt
    if (mattId) {
        const update = {
            name: 'Matt Murdock',
            role: 'lawyer',
            ...(mattUrl && { profilePicture: mattUrl, image: mattUrl }),
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
            verified: true, isProBono: true, gender: 'Male',
            rating: 4.6, reviewCount: 5,
            totalCases: 347, pendingCases: 12,
            reviews: MATT_REVIEWS,
            awards: [{ title: 'Pro Bono Excellence Award', year: 2023 }, { title: 'Best Criminal Defense Lawyer - Hyderabad', year: 2024 }],
            updatedAt: new Date()
        };
        await db.collection('users').doc(mattId).set(update, { merge: true });
        await db.collection('lawyers').doc(mattId).set(update, { merge: true });
        console.log('Matt Murdock updated in Firestore');
    }

    // Update Saul
    if (saulId) {
        const update = {
            name: 'Saul Goodman',
            role: 'lawyer',
            ...(saulUrl && { profilePicture: saulUrl, image: saulUrl }),
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
            verified: true, isProBono: false, gender: 'Male',
            rating: 4.3, reviewCount: 4,
            totalCases: 215, pendingCases: 8,
            reviews: SAUL_REVIEWS,
            awards: [{ title: 'Rising Star in Corporate Law', year: 2024 }],
            updatedAt: new Date()
        };
        await db.collection('users').doc(saulId).set(update, { merge: true });
        await db.collection('lawyers').doc(saulId).set(update, { merge: true });
        console.log('Saul Goodman updated in Firestore');
    }

    // Verify
    console.log('\n--- Verification ---');
    for (const [name, id] of [['Matt', mattId], ['Saul', saulId]]) {
        if (!id) continue;
        const d = (await db.collection('lawyers').doc(id).get()).data();
        console.log(`${name}: photo=${d.profilePicture ? 'SET' : 'MISSING'} | cases=${d.totalCases} | reviews=${d.reviewCount} | rating=${d.rating}`);
    }

    console.log('\nDone!');
    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
